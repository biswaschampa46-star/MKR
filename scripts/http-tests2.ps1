$base = "http://localhost:3111"
$prodId = "a605201b-c3fe-4103-af03-14bad7951075"
function Order($city, $purpose, $coupon, $extra) {
  $body = @{
    name = "Test User"; phone = "01712345678"; address = "12 Test Road"
    city = $city; method = "bkash"; paymentPurpose = $purpose
    clientRequestId = [guid]::NewGuid().ToString()
    items = @(@{ productId = $prodId; variant = "Standard"; qty = 1 })
    couponCode = $coupon
  }
  if ($extra) { foreach ($k in $extra.Keys) { $body[$k] = $extra[$k] } }
  try {
    return Invoke-RestMethod "$base/api/checkout" -Method POST -ContentType "application/json" -Body ($body | ConvertTo-Json -Depth 5)
  } catch {
    $r = $_.Exception.Response
    $rd = New-Object System.IO.StreamReader($r.GetResponseStream())
    return $rd.ReadToEnd()
  }
}
"T6 expired coupon: " + (Order "Dhaka" "full_order" "EXPIRED123" $null | ConvertTo-Json -Compress)
"T8 tampered item (price=1, qty=99): " + (Order "Dhaka" "full_order" $null @{items=@(@{productId=$prodId;variant="Standard";qty=99;price=1;unitPrice=0})} | ConvertTo-Json -Compress)
