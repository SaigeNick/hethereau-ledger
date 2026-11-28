# Hethereau Ledger - pull history sync for Neverness to Everness
#
# Run in PowerShell as administrator:
#   irm https://<site>/sync.ps1 | iex
#
# While this runs, open your pull history in the game and turn the pages.
# When the site passes the time of your newest saved pull ($HlSince), the
# script says when you have reached it, so only new pages need opening.
# It keeps only the game's history packets, packs them, and copies the result
# to your clipboard; paste it on the site. Decoding happens on the site, so
# this script does not need updates when new characters or banners arrive.
#
# It only reads network traffic. It does not touch the game, its files or its
# memory. Uses only what ships with Windows: PowerShell + .NET raw sockets.

$ErrorActionPreference = 'Stop'
$HlVersion = '1.1.0'
$targets = @()
if (Get-Variable HlSince -ErrorAction SilentlyContinue) { $targets = @($HlSince | Where-Object { $_ }) }
Remove-Variable HlSince -ErrorAction SilentlyContinue
$HlSite = 'https://hethereau-ledger.pages.dev/'

function Write-Ok($text) { Write-Host $text -ForegroundColor Green }
function Write-Warn($text) { Write-Host $text -ForegroundColor Yellow }

Write-Host ''
Write-Host "Hethereau Ledger sync $HlVersion" -ForegroundColor Magenta
Write-Host ''

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warn 'Please run PowerShell as administrator (right-click Start > Terminal (Admin)), then paste the command again.'
    Write-Warn 'Windows only lets administrators read network packets.'
    return
}

if (-not ('HlSync2' -as [type])) {
Add-Type -TypeDefinition @'
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Threading;

public class HlSync2 {
    public static ConcurrentQueue<byte[]> Found = new ConcurrentQueue<byte[]>();
    public static long Seen = 0;
    public static long Pages = 0;
    private static HashSet<int> ports = new HashSet<int>();
    private static object portLock = new object();
    private static HashSet<string> hashes = new HashSet<string>();
    private static byte[] needle = System.Text.Encoding.ASCII.GetBytes("LotteryRecordData");

    private Socket sock;
    private Thread thread;
    private volatile bool running;

    public HlSync2(string ip) {
        sock = new Socket(AddressFamily.InterNetwork, SocketType.Raw, ProtocolType.IP);
        sock.Bind(new IPEndPoint(IPAddress.Parse(ip), 0));
        sock.SetSocketOption(SocketOptionLevel.IP, SocketOptionName.HeaderIncluded, true);
        sock.ReceiveBufferSize = 16 * 1024 * 1024;
        sock.IOControl(IOControlCode.ReceiveAll, BitConverter.GetBytes(1), new byte[4]);
    }

    // Stop markers: 40-bit windows of the newest saved pull's timestamp, at all
    // eight bit offsets (see syncHint.ts on the site). Value = banner index.
    private static Dictionary<long, int> marks = new Dictionary<long, int>();
    public static int[] Reached = new int[0];

    public static void SetTargets(int count) {
        marks.Clear();
        Reached = new int[count];
    }

    public static void AddTarget(int index, long lo, long hi) {
        long mask = (1L << 40) - 1;
        for (int k = 0; k < 8; k++) {
            int shift = 24 - k;
            for (long w = lo >> shift; w <= (hi >> shift); w++) { marks[w & mask] = index; }
        }
    }

    private static void CheckMarks(byte[] d) {
        if (marks.Count == 0) { return; }
        for (int i = 0; i + 5 <= d.Length; i++) {
            long w = (long)d[i] | ((long)d[i + 1] << 8) | ((long)d[i + 2] << 16) | ((long)d[i + 3] << 24) | ((long)d[i + 4] << 32);
            int index;
            if (marks.TryGetValue(w, out index)) { Reached[index] = 1; }
        }
    }

    public static void SetPorts(int[] list) {
        lock (portLock) {
            ports.Clear();
            foreach (int p in list) { ports.Add(p); }
        }
    }

    public void Start() {
        running = true;
        thread = new Thread(Loop);
        thread.IsBackground = true;
        thread.Start();
    }

    public void Stop() {
        running = false;
        try { sock.Close(); } catch { }
    }

    // History arrives at any bit offset, so look for the marker at all eight.
    public static bool HasHistory(byte[] d) {
        for (int k = 0; k < 8; k++) {
            int limit = d.Length - needle.Length;
            for (int i = 0; i < limit; i++) {
                bool ok = true;
                for (int j = 0; j < needle.Length; j++) {
                    int b = ((d[i + j] >> k) | (d[i + j + 1] << (8 - k))) & 0xFF;
                    if (b != needle[j]) { ok = false; break; }
                }
                if (ok) { return true; }
            }
        }
        return false;
    }

    private void Loop() {
        byte[] buf = new byte[65535];
        SHA1 sha = SHA1.Create();
        while (running) {
            int n;
            try { n = sock.Receive(buf); }
            catch { if (!running) { break; } continue; }
            Interlocked.Increment(ref Seen);
            if (n < 28 || (buf[0] >> 4) != 4 || buf[9] != 17) { continue; }
            int ihl = (buf[0] & 0x0F) * 4;
            int dport = (buf[ihl + 2] << 8) | buf[ihl + 3];
            bool match;
            lock (portLock) { match = ports.Contains(dport); }
            if (!match) { continue; }
            int total = (buf[2] << 8) | buf[3];
            if (total == 0 || total > n) { total = n; }
            int len = total - ihl - 8;
            if (len <= 32) { continue; }
            byte[] data = new byte[len];
            Buffer.BlockCopy(buf, ihl + 8, data, 0, len);
            if (!HasHistory(data)) { continue; }
            string h = Convert.ToBase64String(sha.ComputeHash(data));
            lock (hashes) {
                if (hashes.Contains(h)) { continue; }
                hashes.Add(h);
            }
            Interlocked.Increment(ref Pages);
            CheckMarks(data);
            Found.Enqueue(data);
        }
    }

    // "HL1:" + base64(gzip(frames)), frame = u32 length + payload.
    public static string Pack(List<byte[]> packets) {
        MemoryStream ms = new MemoryStream();
        using (GZipStream gz = new GZipStream(ms, CompressionMode.Compress, true)) {
            foreach (byte[] p in packets) {
                byte[] len = BitConverter.GetBytes(p.Length);
                gz.Write(len, 0, 4);
                gz.Write(p, 0, p.Length);
            }
        }
        return "HL1:" + Convert.ToBase64String(ms.ToArray());
    }
}
'@
}

function Find-Game {
    $all = Get-Process | Where-Object { $_.ProcessName -match 'HTGame' -or $_.MainWindowTitle -match 'Neverness' }
    if (-not $all) { return $null }
    return $all | Sort-Object WorkingSet64 -Descending | Select-Object -First 1
}

$game = Find-Game
while (-not $game) {
    Write-Warn 'Neverness to Everness is not running.'
    Write-Host 'Start the game and log in, then press Enter here.'
    [void](Read-Host)
    $game = Find-Game
}
Write-Ok ("Found the game (PID {0})." -f $game.Id)

[HlSync2]::SetTargets($targets.Count)
for ($i = 0; $i -lt $targets.Count; $i++) { [HlSync2]::AddTarget($i, [long]$targets[$i].Lo, [long]$targets[$i].Hi) }

$addresses = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.AddressState -eq 'Preferred' } |
    Select-Object -ExpandProperty IPAddress)
$listeners = @()
foreach ($a in $addresses) {
    try { $l = New-Object HlSync2($a); $l.Start(); $listeners += $l } catch { }
}
if (-not $listeners) {
    Write-Warn 'Could not listen to the network. If Windows Firewall asked about PowerShell, allow it and run again.'
    return
}

function Update-Ports {
    $list = @(Get-NetUDPEndpoint -OwningProcess $game.Id -ErrorAction SilentlyContinue | Select-Object -ExpandProperty LocalPort)
    [HlSync2]::SetPorts([int[]]@($list | Where-Object { $_ } | ForEach-Object { [int]$_ }))
}
Update-Ports

Write-Host ''
if ($targets.Count) {
    Write-Host 'Newest pulls already on the site:' -ForegroundColor Cyan
    foreach ($t in $targets) { Write-Host ("  {0}: {1}" -f $t.Name, $t.When) }
    Write-Host ''
    Write-Host 'Now, in the game:' -ForegroundColor Cyan
    Write-Host '  open the pull history of each banner you pulled on since then'
    Write-Host '  and turn the pages until this window says "reached saved pulls".'
    Write-Host '  A banner that is not listed above: scroll its history to the end once.'
    Write-Host '  Then come back here and press Enter.'
} else {
    Write-Host 'Now, in the game:' -ForegroundColor Cyan
    Write-Host '  open the pull history of a banner and scroll all the way to the end.'
    Write-Host '  You can do several banners in one go.'
    Write-Host '  Then come back here and press Enter.'
}
Write-Host ''

$packets = New-Object 'System.Collections.Generic.List[byte[]]'
$announced = @{}
$last = [DateTime]::UtcNow
try {
    while ($true) {
        $p = $null
        while ([HlSync2]::Found.TryDequeue([ref]$p)) { $packets.Add($p) }
        if (([DateTime]::UtcNow - $last).TotalSeconds -ge 1) {
            Update-Ports
            $last = [DateTime]::UtcNow
            for ($i = 0; $i -lt $targets.Count; $i++) {
                if ([HlSync2]::Reached[$i] -and -not $announced[$i]) {
                    $announced[$i] = $true
                    Write-Host ''
                    Write-Ok ("  OK  {0}: reached saved pulls, no need to turn more pages." -f $targets[$i].Name)
                }
            }
            Write-Host ("`r  history pages captured: {0}   " -f [HlSync2]::Pages) -NoNewline
            if ($game.HasExited) { Write-Host ''; Write-Warn 'The game closed.'; break }
        }
        if ([Console]::KeyAvailable) {
            $key = [Console]::ReadKey($true)
            if ($key.Key -eq 'Enter') { Write-Host ''; break }
        }
        Start-Sleep -Milliseconds 100
    }
} finally {
    foreach ($l in $listeners) { $l.Stop() }
}
$p = $null
while ([HlSync2]::Found.TryDequeue([ref]$p)) { $packets.Add($p) }

if ($packets.Count -eq 0) {
    Write-Warn 'No history was captured. Keep this window open while you scroll the history in the game, then try again.'
    return
}

$text = [HlSync2]::Pack($packets)
Set-Clipboard -Value $text
Write-Ok ("Done: {0} pages copied to your clipboard." -f $packets.Count)
Write-Host 'Go to the Import page on the site and press Ctrl+V.'
if ($HlSite) { Start-Process ($HlSite + '#/import') }
