# Hethereau Ledger - sample recorder (research build)
#
# Records the network packets of the running Neverness to Everness client
# (only the game's own ports) so the history decoder can be built and tested.
# It reads traffic only. It does not touch the game, its files or its memory.
#
# Keys while recording:
#   L = I am opening Limited board history     S = Standard board history
#   A = Arc Miracle Box history                M = Mystery Box history
#   Q = stop and save
#
# Uses only what ships with Windows: PowerShell + .NET raw sockets. Needs admin.

$ErrorActionPreference = 'Stop'
$Version = '0.1.0'

function Write-Info($text) { Write-Host $text -ForegroundColor Cyan }
function Write-Ok($text) { Write-Host $text -ForegroundColor Green }
function Write-Warn($text) { Write-Host $text -ForegroundColor Yellow }

Write-Host ''
Write-Host "Hethereau Ledger sample recorder $Version" -ForegroundColor Magenta
Write-Host ''

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warn 'This needs administrator rights (Windows only lets admins read network packets).'
    Write-Warn 'Close this window and double-click hl-record.cmd, then press Yes when Windows asks.'
    exit 1
}

Add-Type -TypeDefinition @'
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Net;
using System.Net.Sockets;
using System.Threading;

public class HlPacket {
    public long Ticks;
    public int Proto;
    public string Src;
    public int SrcPort;
    public string Dst;
    public int DstPort;
    public byte[] Data;
}

public class HlSniffer {
    public static ConcurrentQueue<HlPacket> Queue = new ConcurrentQueue<HlPacket>();
    public static long Seen = 0;
    public static long Matched = 0;
    public static long Dropped = 0;
    private static HashSet<int> ports = new HashSet<int>();
    private static object portLock = new object();

    private Socket sock;
    private Thread thread;
    private volatile bool running;
    public string Address;

    public HlSniffer(string ip) {
        Address = ip;
        sock = new Socket(AddressFamily.InterNetwork, SocketType.Raw, ProtocolType.IP);
        sock.Bind(new IPEndPoint(IPAddress.Parse(ip), 0));
        sock.SetSocketOption(SocketOptionLevel.IP, SocketOptionName.HeaderIncluded, true);
        sock.ReceiveBufferSize = 16 * 1024 * 1024;
        byte[] on = BitConverter.GetBytes(1);
        byte[] outValue = new byte[4];
        sock.IOControl(IOControlCode.ReceiveAll, on, outValue);
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

    private static string Ip(byte[] b, int o) {
        return b[o] + "." + b[o + 1] + "." + b[o + 2] + "." + b[o + 3];
    }

    private void Loop() {
        byte[] buf = new byte[65535];
        while (running) {
            int n;
            try { n = sock.Receive(buf); }
            catch { if (!running) { break; } continue; }
            Interlocked.Increment(ref Seen);
            if (n < 20 || (buf[0] >> 4) != 4) { continue; }
            int ihl = (buf[0] & 0x0F) * 4;
            int proto = buf[9];
            if (proto != 17 && proto != 6) { continue; }
            int fragOffset = ((buf[6] & 0x1F) << 8) | buf[7];
            if (fragOffset != 0) { continue; }
            int total = (buf[2] << 8) | buf[3];
            if (total == 0 || total > n) { total = n; }
            if (total < ihl + 8) { continue; }
            int sport = (buf[ihl] << 8) | buf[ihl + 1];
            int dport = (buf[ihl + 2] << 8) | buf[ihl + 3];
            bool match;
            lock (portLock) { match = ports.Contains(sport) || ports.Contains(dport); }
            if (!match) { continue; }
            int start = proto == 17 ? ihl + 8 : ihl + ((buf[ihl + 12] >> 4) * 4);
            int len = total - start;
            if (len <= 0) { continue; }
            if (Queue.Count > 500000) { Interlocked.Increment(ref Dropped); continue; }
            HlPacket p = new HlPacket();
            p.Ticks = DateTime.UtcNow.Ticks;
            p.Proto = proto;
            p.Src = Ip(buf, 12);
            p.Dst = Ip(buf, 16);
            p.SrcPort = sport;
            p.DstPort = dport;
            p.Data = new byte[len];
            Buffer.BlockCopy(buf, start, p.Data, 0, len);
            Interlocked.Increment(ref Matched);
            Queue.Enqueue(p);
        }
    }
}
'@

function Find-Game {
    $all = Get-Process | Where-Object {
        $_.ProcessName -match 'HTGame|Neverness|NTE' -or $_.MainWindowTitle -match 'Neverness|NTE'
    }
    if (-not $all) { return $null }
    # The real client is the biggest one; launchers are small.
    return $all | Sort-Object WorkingSet64 -Descending | Select-Object -First 1
}

$game = Find-Game
while (-not $game) {
    Write-Warn 'Neverness to Everness is not running yet.'
    Write-Host 'Start the game (you can stay on the main menu), then press Enter here.'
    [void](Read-Host)
    $game = Find-Game
}
Write-Ok ("Found the game: {0}.exe (PID {1})" -f $game.ProcessName, $game.Id)

$addresses = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.AddressState -eq 'Preferred' } |
    Select-Object -ExpandProperty IPAddress)
if (-not $addresses) {
    Write-Warn 'No active IPv4 network connection was found.'
    exit 1
}
$localSet = @{}
foreach ($a in $addresses) { $localSet[$a] = $true }

$sniffers = @()
foreach ($a in $addresses) {
    try {
        $s = New-Object HlSniffer($a)
        $s.Start()
        $sniffers += $s
    } catch {
        Write-Warn ("Could not listen on {0}: {1}" -f $a, $_.Exception.Message)
    }
}
if (-not $sniffers) {
    Write-Warn 'Could not open any network listener. If Windows Firewall asked about PowerShell, allow it and run again.'
    exit 1
}

function Update-Ports {
    $list = @()
    $list += Get-NetUDPEndpoint -OwningProcess $game.Id -ErrorAction SilentlyContinue | Select-Object -ExpandProperty LocalPort
    $list += Get-NetTCPConnection -OwningProcess $game.Id -ErrorAction SilentlyContinue | Select-Object -ExpandProperty LocalPort
    $unique = @($list | Where-Object { $_ } | Sort-Object -Unique | ForEach-Object { [int]$_ })
    [HlSniffer]::SetPorts([int[]]$unique)
    return $unique.Count
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$desktop = [Environment]::GetFolderPath('Desktop')
$outFile = Join-Path $desktop "hethereau-sample-$stamp.jsonl"
$writer = New-Object System.IO.StreamWriter($outFile, $false, (New-Object System.Text.UTF8Encoding($false)))

$header = @{
    kind = 'header'; tool = 'hl-record'; version = $Version
    process = $game.ProcessName; started = (Get-Date).ToUniversalTime().ToString('o')
    os = [Environment]::OSVersion.VersionString
} | ConvertTo-Json -Compress
$writer.WriteLine($header)

function Write-Marker($label) {
    $line = @{ kind = 'marker'; label = $label; t = [DateTime]::UtcNow.Ticks } | ConvertTo-Json -Compress
    $writer.WriteLine($line)
    Write-Ok ("Marker: {0}" -f $label)
}

$portCount = Update-Ports
Write-Host ''
Write-Info 'Recording. Now in the game:'
Write-Host '  1. Press L here, then open the Limited board history and scroll to the very end.'
Write-Host '  2. Press S, open the Standard board history, scroll to the end.'
Write-Host '  3. Press A, open the Arc Miracle Box history, scroll to the end.'
Write-Host '  4. Press M, open the Mystery Box history, scroll to the end.'
Write-Host '  5. Press Q here to stop and save.'
Write-Host ''

$labels = @{ 'L' = 'limited'; 'S' = 'standard'; 'A' = 'arc'; 'M' = 'mystery' }
$lastPorts = [DateTime]::UtcNow
$written = 0
$bytes = 0
$stop = $false
$maxBytes = 300MB

try {
    while (-not $stop) {
        $p = $null
        $batch = 0
        while ($batch -lt 2000 -and [HlSniffer]::Queue.TryDequeue([ref]$p)) {
            $dir = if ($localSet.ContainsKey($p.Src)) { 'out' } else { 'in' }
            $local = if ($dir -eq 'out') { $p.SrcPort } else { $p.DstPort }
            $remote = if ($dir -eq 'out') { $p.DstPort } else { $p.SrcPort }
            $remoteIp = if ($dir -eq 'out') { $p.Dst } else { $p.Src }
            $proto = if ($p.Proto -eq 17) { 'udp' } else { 'tcp' }
            $b64 = [Convert]::ToBase64String($p.Data)
            $writer.WriteLine(('{{"kind":"pkt","t":{0},"p":"{1}","dir":"{2}","lp":{3},"rp":{4},"rip":"{5}","b":"{6}"}}' -f $p.Ticks, $proto, $dir, $local, $remote, $remoteIp, $b64))
            $written++
            $bytes += $p.Data.Length
            $batch++
        }

        if (([DateTime]::UtcNow - $lastPorts).TotalSeconds -ge 1) {
            $portCount = Update-Ports
            $lastPorts = [DateTime]::UtcNow
            Write-Host ("`r  packets saved: {0,8}   data: {1,6:N1} MB   game ports: {2}   " -f $written, ($bytes / 1MB), $portCount) -NoNewline
            if ($game.HasExited) { Write-Host ''; Write-Warn 'The game closed. Saving.'; $stop = $true }
            if ($bytes -gt $maxBytes) { Write-Host ''; Write-Warn 'Reached 300 MB. Saving.'; $stop = $true }
        }

        while ([Console]::KeyAvailable) {
            $key = [Console]::ReadKey($true).Key.ToString().ToUpper()
            if ($key -eq 'Q') { $stop = $true; Write-Host '' }
            elseif ($labels.ContainsKey($key)) { Write-Host ''; Write-Marker $labels[$key] }
        }
        if ($batch -eq 0) { Start-Sleep -Milliseconds 50 }
    }
} finally {
    foreach ($s in $sniffers) { $s.Stop() }
    Start-Sleep -Milliseconds 200
    $p = $null
    while ([HlSniffer]::Queue.TryDequeue([ref]$p)) { $written++ }
    $footer = @{ kind = 'footer'; seen = [HlSniffer]::Seen; matched = [HlSniffer]::Matched; dropped = [HlSniffer]::Dropped; saved = $written } | ConvertTo-Json -Compress
    $writer.WriteLine($footer)
    $writer.Close()
}

$zip = [IO.Path]::ChangeExtension($outFile, '.zip')
Compress-Archive -Path $outFile -DestinationPath $zip -Force
Remove-Item $outFile
Write-Host ''
Write-Ok "Saved: $zip"
Write-Host 'Send this file to Claude in the chat. You can close this window.'
Start-Process explorer.exe "/select,`"$zip`""
