<?php
/**
 * Generates separate M3U + JSON playlists for /Films and /Series.
 *
 * Films layout:   Films/<Category?>/<Movie file>.<ext>
 * Series layout:  Series/<ShowName>/Season X/<Episode file>.<ext>
 *
 * Outputs:
 *   - films.m3u
 *   - series.m3u
 *   - films.json
 *   - series.json
 */

// ---------- CONFIG ----------
$baseUrl    = 'https://vstreamzzz.veditzzz.site';
$filmsDir   = realpath(__DIR__ . '/Films');
$seriesDir  = realpath(__DIR__ . '/Series');
$filmsUrl   = $baseUrl . '/Films';
$seriesUrl  = $baseUrl . '/Series';
$cacheDir   = __DIR__ . '/cache';
$posterDir  = __DIR__ . '/posters';
$posterUrl  = $baseUrl . '/posters';
$apiKey     = '18831cfa492c8b9002f37c892bbd8de2';

if (!is_dir($cacheDir))  mkdir($cacheDir, 0775, true);
if (!is_dir($posterDir)) mkdir($posterDir, 0775, true);

// CORS so the React UI can fetch the JSON from another origin
header('Access-Control-Allow-Origin: *');

// ---------- HELPERS ----------
function cleanTitle(string $raw): string {
    $t = preg_replace('/\.(1080p|720p|2160p|BluRay|WEBRip|WEB-DL|HDRip|DVDRip|x264|x265|HEVC|AAC|AC3|DTS|YIFY|RARBG|EVO|FGT|NTb)/i', '', $raw);
    $t = preg_replace('/[._]/', ' ', $t);
    return trim(preg_replace('/\s+/', ' ', $t));
}

function extractYear(string $title): ?string {
    return preg_match('/(19|20)\d{2}/', $title, $m) ? $m[0] : null;
}

/**
 * Look up TMDB metadata (movie or tv) with on-disk caching.
 * Returns [ 'title' => string, 'poster' => string (url or '') ]
 */
function tmdbLookup(string $type, string $cleanTitle, ?string $year, string $apiKey, string $cacheDir, string $posterDir, string $posterUrl): array {
    $cacheKey  = md5($type . '|' . $cleanTitle);
    $cacheFile = $cacheDir . '/' . $cacheKey . '.json';

    if (file_exists($cacheFile)) {
        $cached = json_decode(file_get_contents($cacheFile), true);
        if ($cached) return $cached;
    }

    $title  = $cleanTitle;
    $poster = '';

    $endpoint = $type === 'tv' ? 'search/tv' : 'search/movie';
    $url = "https://api.themoviedb.org/3/{$endpoint}?api_key={$apiKey}&query=" . urlencode($cleanTitle);
    if ($year) {
        $url .= $type === 'tv' ? "&first_air_date_year={$year}" : "&year={$year}";
    }

    $response = @file_get_contents($url);
    if ($response) {
        $data = json_decode($response, true);
        if (!empty($data['results'][0])) {
            $hit = $data['results'][0];
            $title = $hit[$type === 'tv' ? 'name' : 'title'] ?? $cleanTitle;

            if (!empty($hit['poster_path'])) {
                $remote = "https://image.tmdb.org/t/p/w500" . $hit['poster_path'];
                $local  = $posterDir . '/' . $cacheKey . '.jpg';
                if (!file_exists($local)) {
                    $img = @file_get_contents($remote);
                    if ($img) file_put_contents($local, $img);
                }
                if (file_exists($local)) {
                    $poster = $posterUrl . '/' . $cacheKey . '.jpg';
                }
            }
        }
    }

    $result = ['title' => $title, 'poster' => $poster];
    file_put_contents($cacheFile, json_encode($result));
    return $result;
}

function isVideo(string $ext): bool {
    return in_array(strtolower($ext), ['mp4', 'mkv', 'avi', 'mov', 'm4v', 'webm'], true);
}

// ---------- FILMS ----------
$filmsM3u  = "#EXTM3U\n";
$filmsJson = [];

if ($filmsDir && is_dir($filmsDir)) {
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($filmsDir, RecursiveDirectoryIterator::SKIP_DOTS));
    foreach ($it as $file) {
        if (!$file->isFile() || !isVideo($file->getExtension())) continue;

        $rel   = str_replace('\\', '/', str_replace($filmsDir . DIRECTORY_SEPARATOR, '', $file->getRealPath()));
        $folder = dirname($rel);
        $group  = $folder !== '.' ? explode('/', $folder)[0] : 'Movies';

        $clean = cleanTitle(pathinfo($file->getFilename(), PATHINFO_FILENAME));
        $year  = extractYear($clean);

        $meta  = tmdbLookup('movie', $clean, $year, $apiKey, $cacheDir, $posterDir, $posterUrl);
        $stream = $filmsUrl . '/' . rawurlencode($rel);

        $filmsM3u .= '#EXTINF:-1 tvg-logo="' . $meta['poster'] . '" group-title="' . $group . '",' . $meta['title'] . "\n";
        $filmsM3u .= $stream . "\n";

        $filmsJson[] = [
            'title'  => $meta['title'],
            'poster' => $meta['poster'],
            'group'  => $group,
            'year'   => $year,
            'stream' => $stream,
        ];
    }
}

file_put_contents(__DIR__ . '/films.m3u',  $filmsM3u);
file_put_contents(__DIR__ . '/films.json', json_encode($filmsJson, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));

// ---------- SERIES ----------
// Structure: Series/<Show>/Season X/<Episode>.ext
$seriesM3u = "#EXTM3U\n";
$seriesMap = []; // show => [ 'title','poster','seasons' => [ seasonNum => [ episodes ] ] ]

if ($seriesDir && is_dir($seriesDir)) {
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($seriesDir, RecursiveDirectoryIterator::SKIP_DOTS));
    foreach ($it as $file) {
        if (!$file->isFile() || !isVideo($file->getExtension())) continue;

        $rel   = str_replace('\\', '/', str_replace($seriesDir . DIRECTORY_SEPARATOR, '', $file->getRealPath()));
        $parts = explode('/', $rel);
        if (count($parts) < 2) continue;

        $showFolder   = $parts[0];
        $seasonFolder = $parts[1] ?? '';
        $seasonNum    = preg_match('/(\d+)/', $seasonFolder, $m) ? (int)$m[1] : 1;

        // Episode number from filename (SxxExx or Exx)
        $fname = pathinfo($file->getFilename(), PATHINFO_FILENAME);
        $epNum = null;
        if (preg_match('/[Ss](\d{1,2})[Ee](\d{1,3})/', $fname, $m)) {
            $seasonNum = (int)$m[1];
            $epNum     = (int)$m[2];
        } elseif (preg_match('/[Ee](\d{1,3})/', $fname, $m)) {
            $epNum = (int)$m[1];
        }

        $epTitle = cleanTitle($fname);
        $stream  = $seriesUrl . '/' . rawurlencode($rel);

        if (!isset($seriesMap[$showFolder])) {
            $cleanShow = cleanTitle($showFolder);
            $meta = tmdbLookup('tv', $cleanShow, null, $apiKey, $cacheDir, $posterDir, $posterUrl);
            $seriesMap[$showFolder] = [
                'title'   => $meta['title'],
                'poster'  => $meta['poster'],
                'seasons' => [],
            ];
        }

        $seriesMap[$showFolder]['seasons'][$seasonNum][] = [
            'episode' => $epNum,
            'title'   => $epTitle,
            'stream'  => $stream,
        ];

        $seriesM3u .= '#EXTINF:-1 tvg-logo="' . $seriesMap[$showFolder]['poster'] . '" group-title="' . $seriesMap[$showFolder]['title'] . '",' . $seriesMap[$showFolder]['title'] . ' - S' . sprintf('%02d', $seasonNum) . ($epNum ? 'E' . sprintf('%02d', $epNum) : '') . "\n";
        $seriesM3u .= $stream . "\n";
    }
}

// Normalise series JSON shape and sort episodes
$seriesJson = [];
foreach ($seriesMap as $show) {
    $seasons = [];
    ksort($show['seasons']);
    foreach ($show['seasons'] as $num => $eps) {
        usort($eps, fn($a, $b) => ($a['episode'] ?? 0) <=> ($b['episode'] ?? 0));
        $seasons[] = ['season' => $num, 'episodes' => $eps];
    }
    $seriesJson[] = [
        'title'   => $show['title'],
        'poster'  => $show['poster'],
        'seasons' => $seasons,
    ];
}

file_put_contents(__DIR__ . '/series.m3u',  $seriesM3u);
file_put_contents(__DIR__ . '/series.json', json_encode($seriesJson, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));

echo "Films + Series playlists generated!\n";
