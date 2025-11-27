<?php
$client_id = '52ec9869958e47e2898e85242e0f061a';
$client_secret = 'YOUR_CLIENT_SECRET';

$code = $_POST['code'] ?? '';
$code_verifier = $_POST['code_verifier'] ?? '';
$redirect_uri = $_POST['redirect_uri'] ?? '';

if (!$code || !$code_verifier || !$redirect_uri) {
    http_response_code(400);
    echo json_encode(['error'=>'Missing parameters']);
    exit;
}

$ch = curl_init('https://accounts.spotify.com/api/token');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
    'client_id' => $client_id,
    'client_secret' => $client_secret,
    'grant_type' => 'authorization_code',
    'code' => $code,
    'redirect_uri' => $redirect_uri,
    'code_verifier' => $code_verifier
]));
$response = curl_exec($ch);
curl_close($ch);
header('Content-Type: application/json');
echo $response;
?>