<?php
/**
 * Feed do Instagram de @carollussana para o site (Instagram API with Instagram Login).
 *
 * - O token de longa duração fica em data/token.json, bloqueado para a web por data/.htaccess.
 * - A resposta da API fica em cache (data/cache.json) por CACHE_TTL segundos.
 * - O token é renovado automaticamente quando passa de REFRESH_AFTER (validade: 60 dias).
 *   Basta o site receber uma visita a cada ~50 dias para ele nunca expirar.
 * - Se a API falhar, servimos o último cache válido; o site ainda tem o fallback estático.
 * - A resposta nunca contém o token; erros vão para o log do PHP.
 *
 * Configuração: ver README.md › "Instagram".
 */

declare(strict_types=1);

const DATA_DIR = __DIR__ . '/data';
const TOKEN_FILE = DATA_DIR . '/token.json';
const CACHE_FILE = DATA_DIR . '/cache.json';
const CACHE_TTL = 3600;            // 1 hora
const REFRESH_AFTER = 7 * 86400;   // renova o token a cada 7 dias
const LIMIT = 12;
const GRAPH = 'https://graph.instagram.com';
const FIELDS = ['id', 'caption', 'media_type', 'media_url', 'thumbnail_url', 'permalink', 'timestamp'];

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex');

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    // Cache curto no navegador/CDN quando há dados; nenhum cache para erros
    header($status === 200 ? 'Cache-Control: public, max-age=900' : 'Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function read_json(string $file): ?array
{
    if (!is_file($file)) {
        return null;
    }
    $data = json_decode((string) file_get_contents($file), true);
    return is_array($data) ? $data : null;
}

function write_json(string $file, array $data): void
{
    // Escrita atômica: grava num temporário e renomeia
    $tmp = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (file_put_contents($tmp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX) !== false) {
        rename($tmp, $file);
    } else {
        error_log('[instagram] não foi possível gravar ' . basename($file));
    }
}

function http_get_json(string $url): ?array
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_TIMEOUT => 8,
            CURLOPT_USERAGENT => 'carollussana.com',
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    } else {
        $context = stream_context_create(['http' => ['timeout' => 8, 'ignore_errors' => true]]);
        $body = @file_get_contents($url, false, $context);
        $status = 200;
        if (isset($http_response_header[0]) && preg_match('#\s(\d{3})\s#', $http_response_header[0], $m)) {
            $status = (int) $m[1];
        }
    }

    if ($body === false || $status >= 400) {
        // Loga só o caminho, nunca a query string (que contém o token)
        error_log('[instagram] HTTP ' . $status . ' em ' . parse_url($url, PHP_URL_PATH));
        return null;
    }
    $data = json_decode((string) $body, true);
    return is_array($data) ? $data : null;
}

function sanitize(array $media): ?array
{
    $item = array_intersect_key($media, array_flip(FIELDS));
    // Só aceitamos links e mídias https do Instagram/Meta
    if (empty($item['permalink']) || !preg_match('#^https://(www\.)?instagram\.com/#', $item['permalink'])) {
        return null;
    }
    foreach (['media_url', 'thumbnail_url'] as $key) {
        if (isset($item[$key]) && strpos((string) $item[$key], 'https://') !== 0) {
            unset($item[$key]);
        }
    }
    return $item;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    respond(['error' => 'method_not_allowed'], 405);
}

$cache = read_json(CACHE_FILE);
$cacheAge = time() - (int) ($cache['fetched_at'] ?? 0);
if ($cache && $cacheAge < CACHE_TTL) {
    respond(['items' => $cache['items'] ?? [], 'source' => 'cache']);
}

$token = read_json(TOKEN_FILE);
if (!$token || empty($token['access_token'])) {
    if ($cache) {
        respond(['items' => $cache['items'] ?? [], 'source' => 'stale']);
    }
    respond(['items' => [], 'error' => 'not_configured'], 503);
}

// Evita que várias visitas simultâneas chamem a API ao mesmo tempo
$lock = fopen(DATA_DIR . '/.lock', 'c');
if ($lock && !flock($lock, LOCK_EX | LOCK_NB)) {
    if ($cache) {
        respond(['items' => $cache['items'] ?? [], 'source' => 'stale']);
    }
    flock($lock, LOCK_EX); // primeira carga: espera a outra requisição terminar
    $fresh = read_json(CACHE_FILE);
    if ($fresh) {
        respond(['items' => $fresh['items'] ?? [], 'source' => 'cache']);
    }
}

// Renovação automática do token de longa duração
$refreshedAt = (int) ($token['refreshed_at'] ?? filemtime(TOKEN_FILE));
if (time() - $refreshedAt > REFRESH_AFTER) {
    $renewed = http_get_json(GRAPH . '/refresh_access_token?grant_type=ig_refresh_token&access_token=' . urlencode($token['access_token']));
    if (!empty($renewed['access_token'])) {
        $token = [
            'access_token' => $renewed['access_token'],
            'refreshed_at' => time(),
            'expires_in' => $renewed['expires_in'] ?? null,
        ];
        write_json(TOKEN_FILE, $token);
    }
}

$url = GRAPH . '/me/media?fields=' . implode(',', FIELDS) . '&limit=' . LIMIT . '&access_token=' . urlencode($token['access_token']);
$result = http_get_json($url);

if (!$result || !isset($result['data']) || !is_array($result['data'])) {
    if ($cache) {
        respond(['items' => $cache['items'] ?? [], 'source' => 'stale']);
    }
    respond(['items' => [], 'error' => 'upstream_unavailable'], 502);
}

$items = array_values(array_filter(array_map('sanitize', $result['data'])));
write_json(CACHE_FILE, ['fetched_at' => time(), 'items' => $items]);
respond(['items' => $items, 'source' => 'live']);
