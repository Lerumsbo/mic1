<?php
header('Content-Type: application/json');

$client_id = '52ec9869958e47e2898e85242e0f061a';

// --- If exchanging authorization code ---
if (isset($_POST['code'], $_POST['code_verifier'], $_POST['redirect_uri'])) {
    $code = $_POST['code'];
    $code_verifier = $_POST['code_verifier'];
    $redirect_uri = $_POST['redirect_uri'];

    $ch = curl_init('https://accounts.spotify.com/api/token');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'client_id' => $client_id,
        'grant_type' => 'authorization_code',
        'code' => $code,
        'redirect_uri' => $redirect_uri,
        'code_verifier' => $code_verifier
    ]));
    $response = curl_exec($ch);
    curl_close($ch);
    echo $response;
    exit;
}

// --- If refreshing access token ---
if (isset($_POST['refresh_token'])) {
    $refresh_token = $_POST['refresh_token'];

    $ch = curl_init('https://accounts.spotify.com/api/token');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'grant_type' => 'refresh_token',
        'refresh_token' => $refresh_token,
        'client_id' => $client_id
    ]));
    $response = curl_exec($ch);
    curl_close($ch);
    echo $response;
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Missing parameters']);
