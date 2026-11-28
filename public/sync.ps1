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
$HlVersion = '1.2.1'
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

if (-not ('HlSync4' -as [type])) {
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

public class HlSync4 {
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

    public HlSync4(string ip) {
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
            Process(buf, n, sha);
        }
    }

    // One IPv4 packet: UDP from the game's ports may be a history page; inbound
    // TCP is kept for a while in case it is the game's login stream.
    public static void Process(byte[] buf, int n, SHA1 sha) {
        if (n < 28 || (buf[0] >> 4) != 4) { return; }
        if (buf[9] == 6) { KeepTcp(buf, n); return; }
        if (buf[9] != 17) { return; }
        int ihl = (buf[0] & 0x0F) * 4;
        int dport = (buf[ihl + 2] << 8) | buf[ihl + 3];
        bool match;
        lock (portLock) { match = ports.Contains(dport); }
        if (!match) { return; }
        int total = (buf[2] << 8) | buf[3];
        if (total == 0 || total > n) { total = n; }
        int len = total - ihl - 8;
        if (len <= 32) { return; }
        byte[] data = new byte[len];
        Buffer.BlockCopy(buf, ihl + 8, data, 0, len);
        if (!HasHistory(data)) { return; }
        string h = Convert.ToBase64String(sha.ComputeHash(data));
        lock (hashes) {
            if (hashes.Contains(h)) { return; }
            hashes.Add(h);
        }
        Interlocked.Increment(ref Pages);
        CheckMarks(data);
        Found.Enqueue(data);
    }

    // ---- Achievements --------------------------------------------------------
    // The game sends the account's achievements once, at login, inside its TCP
    // stream: length-prefixed frames whose payload is an LZ4 block holding
    // "AchievementRecord" entries (format documented by NTE History Exporter).
    // Inbound TCP is buffered per connection; connections that are not the
    // game's are dropped after a few seconds, so only the game's stream stays.
    private class TcpStream { public int Port; public long Last; public List<KeyValuePair<uint, byte[]>> Segs = new List<KeyValuePair<uint, byte[]>>(); public long Bytes; }
    private static Dictionary<string, TcpStream> tcp = new Dictionary<string, TcpStream>();
    private static HashSet<int> gameTcp = new HashSet<int>();
    private static long tcpBytes = 0;
    private const long TcpCap = 192L * 1024 * 1024;
    private static readonly byte[] achMarker = System.Text.Encoding.ASCII.GetBytes("AchievementRecord\0");

    private static void KeepTcp(byte[] buf, int n) {
        int ihl = (buf[0] & 0x0F) * 4;
        int total = (buf[2] << 8) | buf[3];
        if (total == 0 || total > n) { total = n; }
        if (total < ihl + 20) { return; }
        int sport = (buf[ihl] << 8) | buf[ihl + 1];
        int dport = (buf[ihl + 2] << 8) | buf[ihl + 3];
        uint seq = ((uint)buf[ihl + 4] << 24) | ((uint)buf[ihl + 5] << 16) | ((uint)buf[ihl + 6] << 8) | buf[ihl + 7];
        int thl = (buf[ihl + 12] >> 4) * 4;
        int len = total - ihl - thl;
        if (len <= 0 || thl < 20) { return; }
        if (Interlocked.Read(ref tcpBytes) > TcpCap) { return; }
        string key = buf[12] + "." + buf[13] + "." + buf[14] + "." + buf[15] + ":" + sport + ">" + dport;
        byte[] data = new byte[len];
        Buffer.BlockCopy(buf, ihl + thl, data, 0, len);
        lock (tcp) {
            TcpStream st;
            if (!tcp.TryGetValue(key, out st)) { st = new TcpStream(); st.Port = dport; tcp[key] = st; }
            st.Segs.Add(new KeyValuePair<uint, byte[]>(seq, data));
            st.Bytes += len;
            st.Last = DateTime.UtcNow.Ticks;
        }
        Interlocked.Add(ref tcpBytes, len);
    }

    // Local TCP ports the game process has opened (refreshed from PowerShell).
    public static void AddGameTcpPorts(int[] list) {
        lock (tcp) { foreach (int p in list) { gameTcp.Add(p); } }
    }

    private static byte[] foundAch = null;
    private static int dropped = 0;

    // Drops buffered connections that are not the game's and have gone quiet,
    // after a quick look for the achievements block in case the port lookup missed it.
    public static void PruneTcp() {
        long cutoff = DateTime.UtcNow.Ticks - TimeSpan.FromSeconds(5).Ticks;
        List<TcpStream> check = new List<TcpStream>();
        lock (tcp) {
            List<string> gone = new List<string>();
            foreach (KeyValuePair<string, TcpStream> kv in tcp) {
                if (!gameTcp.Contains(kv.Value.Port) && kv.Value.Last < cutoff) { gone.Add(kv.Key); check.Add(kv.Value); }
            }
            foreach (string k in gone) { Interlocked.Add(ref tcpBytes, -tcp[k].Bytes); tcp.Remove(k); dropped++; }
        }
        if (foundAch != null) { return; }
        foreach (TcpStream st in check) {
            if (st.Bytes < 1024) { continue; }
            byte[] stream = Reassemble(st.Segs);
            byte[] f = stream == null ? null : ScanFrames(stream, 0, false);
            if (f != null) { foundAch = f; return; }
        }
    }

    // The decoded block from "AchievementRecord" on, or null. Game connections
    // first (with resync), then every other buffered connection (strict only).
    public static byte[] FindAchievements() {
        if (foundAch != null) { return foundAch; }
        List<TcpStream> game = new List<TcpStream>();
        List<TcpStream> rest = new List<TcpStream>();
        lock (tcp) { foreach (TcpStream st in tcp.Values) { (gameTcp.Contains(st.Port) ? game : rest).Add(st); } }
        foreach (TcpStream st in game) {
            byte[] stream = Reassemble(st.Segs);
            if (stream == null) { continue; }
            byte[] found = ScanFrames(stream, 0, false);
            if (found == null) { found = ScanFrames(stream, 0, true); }
            if (found != null) { return found; }
        }
        foreach (TcpStream st in rest) {
            byte[] stream = Reassemble(st.Segs);
            byte[] found = stream == null ? null : ScanFrames(stream, 0, false);
            if (found != null) { return found; }
        }
        return null;
    }

    // A short report for when nothing was found, so the cause can be pinned down.
    public static string Diagnose() {
        System.Text.StringBuilder sb = new System.Text.StringBuilder();
        List<KeyValuePair<string, TcpStream>> all = new List<KeyValuePair<string, TcpStream>>();
        lock (tcp) {
            foreach (KeyValuePair<string, TcpStream> kv in tcp) { all.Add(kv); }
            sb.AppendFormat("  game TCP ports seen: {0}; buffered connections: {1}; dropped: {2}\n", gameTcp.Count, all.Count, dropped);
        }
        all.Sort((a, b) => b.Value.Bytes.CompareTo(a.Value.Bytes));
        int shown = 0;
        foreach (KeyValuePair<string, TcpStream> kv in all) {
            if (shown++ >= 6) { break; }
            TcpStream st = kv.Value;
            byte[] stream = Reassemble(st.Segs);
            int frames = 0, lz4 = 0;
            bool marker = false;
            if (stream != null) { CountFrames(stream, out frames, out lz4, out marker); }
            sb.AppendFormat("  {0} {1}: {2} KB in {3} segments, contiguous {4} KB, frames {5}, unpacked {6}, marker {7}\n",
                gameTcp.Contains(st.Port) ? "GAME" : "other", kv.Key, st.Bytes / 1024, st.Segs.Count,
                stream == null ? 0 : stream.Length / 1024, frames, lz4, marker ? "yes" : "no");
        }
        return sb.ToString();
    }

    private static void CountFrames(byte[] s, out int frames, out int lz4, out bool marker) {
        frames = 0; lz4 = 0; marker = false;
        int pos = 0, n = s.Length;
        while (pos + 8 <= n) {
            int size = BitConverter.ToInt32(s, pos);
            int f = pos + 4;
            if (size < 20 || (long)f + size > n) { return; }
            frames++;
            int hs = BitConverter.ToInt32(s, f);
            long so = (long)f + 12 + hs;
            if (hs >= 0 && so + 4 <= (long)f + size) {
                int ds = BitConverter.ToInt32(s, (int)so);
                if (ds > 0 && so + 4 + ds <= (long)f + size) {
                    byte[] dec = Lz4(s, (int)so + 4, ds);
                    if (dec != null) { lz4++; if (IndexOf(dec, achMarker) >= 0) { marker = true; } }
                }
            }
            pos = f + size;
        }
    }

    private static byte[] Reassemble(List<KeyValuePair<uint, byte[]>> segs) {
        if (segs.Count == 0) { return null; }
        uint start = segs[0].Key;
        foreach (KeyValuePair<uint, byte[]> s in segs) { if (unchecked((int)(s.Key - start)) < 0) { start = s.Key; } }
        List<KeyValuePair<long, byte[]>> ordered = new List<KeyValuePair<long, byte[]>>();
        foreach (KeyValuePair<uint, byte[]> s in segs) { ordered.Add(new KeyValuePair<long, byte[]>((long)unchecked(s.Key - start), s.Value)); }
        ordered.Sort((a, b) => a.Key.CompareTo(b.Key));
        MemoryStream ms = new MemoryStream();
        foreach (KeyValuePair<long, byte[]> s in ordered) {
            long have = ms.Length;
            if (s.Key > have) { break; }
            long skip = have - s.Key;
            if (skip >= s.Value.Length) { continue; }
            ms.Write(s.Value, (int)skip, s.Value.Length - (int)skip);
        }
        return ms.ToArray();
    }

    // Frame: u32 size, then u32 header size, header, u32 data size at 12+header, data.
    // resync: when the capture began mid-stream, try every offset as a frame start.
    private static byte[] ScanFrames(byte[] s, int pos, bool resync) {
        int n = s.Length;
        while (pos + 8 <= n) {
            int size = BitConverter.ToInt32(s, pos);
            int f = pos + 4;
            bool ok = size >= 20 && (long)f + size <= n;
            if (ok) {
                int hs = BitConverter.ToInt32(s, f);
                long so = (long)f + 12 + hs;
                if (hs >= 0 && so + 4 <= (long)f + size) {
                    int ds = BitConverter.ToInt32(s, (int)so);
                    long d0 = so + 4;
                    if (ds > 0 && d0 + ds <= (long)f + size) {
                        byte[] dec = Lz4(s, (int)d0, ds);
                        if (dec != null) {
                            int m = IndexOf(dec, achMarker);
                            if (m >= 0) {
                                int len = Math.Min(dec.Length - m, 1 << 20);
                                byte[] slice = new byte[len];
                                Buffer.BlockCopy(dec, m, slice, 0, len);
                                return slice;
                            }
                        }
                    }
                }
            }
            if (ok && !resync) { pos = f + size; } else if (resync) { pos++; } else { return null; }
        }
        return null;
    }

    private static int IndexOf(byte[] hay, byte[] needle) {
        for (int i = 0; i + needle.Length <= hay.Length; i++) {
            int j = 0;
            while (j < needle.Length && hay[i + j] == needle[j]) { j++; }
            if (j == needle.Length) { return i; }
        }
        return -1;
    }

    // LZ4 block format. Returns null on anything malformed.
    private static byte[] Lz4(byte[] src, int at, int count) {
        int end = at + count;
        int p = at;
        MemoryStream o = new MemoryStream();
        while (p < end) {
            int token = src[p++];
            int lit = token >> 4;
            if (lit == 15) { int b; do { if (p >= end) { return null; } b = src[p++]; lit += b; } while (b == 255); }
            if (p + lit > end) { return null; }
            o.Write(src, p, lit);
            p += lit;
            if (p >= end) { break; }
            if (p + 2 > end) { return null; }
            int off = src[p] | (src[p + 1] << 8);
            p += 2;
            if (off == 0 || off > o.Length) { return null; }
            int ml = token & 15;
            if (ml == 15) { int b; do { if (p >= end) { return null; } b = src[p++]; ml += b; } while (b == 255); }
            ml += 4;
            if (o.Length + ml > (64 << 20)) { return null; }
            long from = o.Length - off;
            for (int i = 0; i < ml; i++) { o.WriteByte(o.GetBuffer()[from + i]); }
        }
        return o.ToArray();
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

[HlSync4]::SetTargets($targets.Count)
for ($i = 0; $i -lt $targets.Count; $i++) { [HlSync4]::AddTarget($i, [long]$targets[$i].Lo, [long]$targets[$i].Hi) }

$addresses = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.AddressState -eq 'Preferred' } |
    Select-Object -ExpandProperty IPAddress)
$listeners = @()
foreach ($a in $addresses) {
    try { $l = New-Object HlSync4($a); $l.Start(); $listeners += $l } catch { }
}
if (-not $listeners) {
    Write-Warn 'Could not listen to the network. If Windows Firewall asked about PowerShell, allow it and run again.'
    return
}

function Game-Ids {
    @(Get-Process | Where-Object { $_.ProcessName -match 'HTGame' -or $_.MainWindowTitle -match 'Neverness' } | Select-Object -ExpandProperty Id)
}
$script:gameIds = Game-Ids

function Update-Ports {
    # The game can restart its process when you log out, so look it up again each time.
    $ids = Game-Ids
    if ($ids.Count) { $script:gameIds = $ids }
    $list = @(Get-NetUDPEndpoint -OwningProcess $script:gameIds -ErrorAction SilentlyContinue | Select-Object -ExpandProperty LocalPort)
    [HlSync4]::SetPorts([int[]]@($list | Where-Object { $_ } | ForEach-Object { [int]$_ }))
    $tcpPorts = @(Get-NetTCPConnection -OwningProcess $script:gameIds -ErrorAction SilentlyContinue | Select-Object -ExpandProperty LocalPort)
    [HlSync4]::AddGameTcpPorts([int[]]@($tcpPorts | Where-Object { $_ } | ForEach-Object { [int]$_ }))
    [HlSync4]::PruneTcp()
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
    Write-Host ''
    Write-Host 'Achievements too: the game sends them once, when you log in. Run this' -ForegroundColor DarkCyan
    Write-Host 'command on the title screen before logging in, or log out and back in now.' -ForegroundColor DarkCyan
} else {
    Write-Host 'Now, in the game:' -ForegroundColor Cyan
    Write-Host '  open the pull history of a banner and scroll all the way to the end.'
    Write-Host '  You can do several banners in one go.'
    Write-Host '  Then come back here and press Enter.'
    Write-Host ''
    Write-Host 'Achievements too: the game sends them once, when you log in. Run this' -ForegroundColor DarkCyan
    Write-Host 'command on the title screen before logging in, or log out and back in now.' -ForegroundColor DarkCyan
}
Write-Host ''

$packets = New-Object 'System.Collections.Generic.List[byte[]]'
$announced = @{}
$last = [DateTime]::UtcNow
try {
    while ($true) {
        $p = $null
        while ([HlSync4]::Found.TryDequeue([ref]$p)) { $packets.Add($p) }
        if (([DateTime]::UtcNow - $last).TotalSeconds -ge 1) {
            Update-Ports
            $last = [DateTime]::UtcNow
            for ($i = 0; $i -lt $targets.Count; $i++) {
                if ([HlSync4]::Reached[$i] -and -not $announced[$i]) {
                    $announced[$i] = $true
                    Write-Host ''
                    Write-Ok ("  OK  {0}: reached saved pulls, no need to turn more pages." -f $targets[$i].Name)
                }
            }
            Write-Host ("`r  history pages captured: {0}   " -f [HlSync4]::Pages) -NoNewline
            if (-not (Game-Ids).Count -and -not $closedNoted) { $closedNoted = $true; Write-Host ''; Write-Warn 'The game is closed. Start it again, or press Enter to finish.' }
            if ((Game-Ids).Count) { $closedNoted = $false }
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
while ([HlSync4]::Found.TryDequeue([ref]$p)) { $packets.Add($p) }

# Achievements, if the login happened while this was running.
$ach = $null
try { Update-Ports; $ach = [HlSync4]::FindAchievements() } catch { }
if ($ach) {
    $tag = [System.Text.Encoding]::ASCII.GetBytes("HLACH1`0")
    $frame = New-Object byte[] ($tag.Length + $ach.Length)
    [Array]::Copy($tag, $frame, $tag.Length)
    [Array]::Copy($ach, 0, $frame, $tag.Length, $ach.Length)
    $packets.Add($frame)
    Write-Ok 'Achievements found.'
} else {
    Write-Host 'Achievements were not captured (log in again while this runs to include them).' -ForegroundColor DarkGray
    Write-Host 'Details for the site (send a screenshot of these lines if achievements never come through):' -ForegroundColor DarkGray
    try {
        $conns = @(Get-NetTCPConnection -OwningProcess $script:gameIds -ErrorAction SilentlyContinue)
        $v6 = @($conns | Where-Object { $_.LocalAddress -match ':' }).Count
        Write-Host ("  game processes: {0}; game TCP connections now: {1} (IPv6: {2})" -f ($script:gameIds -join ','), $conns.Count, $v6) -ForegroundColor DarkGray
        Write-Host ([HlSync4]::Diagnose()) -ForegroundColor DarkGray -NoNewline
    } catch { Write-Host ('  ' + $_.Exception.Message) -ForegroundColor DarkGray }
}

if ($packets.Count -eq 0) {
    Write-Warn 'No history was captured. Keep this window open while you scroll the history in the game, then try again.'
    return
}

$text = [HlSync4]::Pack($packets)
Set-Clipboard -Value $text
Write-Ok ("Done: {0} pages copied to your clipboard." -f $packets.Count)
Write-Host 'Go to the Import page on the site and press Ctrl+V.'
if ($HlSite) { Start-Process ($HlSite + '#/import') }
