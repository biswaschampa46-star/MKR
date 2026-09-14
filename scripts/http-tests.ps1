$base = "http://localhost:3111"
$prods = Invoke-RestMethod "$base/api/search?q=" -Method GET
# fallback: fetch a product id from shop page API or db via search
$p = Invoke-RestMethod "$base/api/search?q=Bla" -Method GET
$prodId = $p.results[0].id
"PRODUCT: $($p.results[0].name) price=$($p.results[0].price) id=$prodId"
function Order($name, $city, $purpose, $coupon, $extra) {
  $body = @{
    name = "Test User"; phone = "01712345678"; address = "12 Test Road, Area 5"
    city = $city; method = "bkash"; paymentPurpose = $purpose
    clientRequestId = [guid]::NewGuid().ToString(); items = @(@{ productId = $prodId; variant = "Standard"; qty = 1 })
    couponCode = $coupon
  }
  if ($extra) { foreach ($k in $extra.Keys) { $body[$k] = $extra[$k] } }
  try {
    return Invoke-RestMethod "$base/api/checkout" -Method POST -ContentType "application/json" -Body ($body | ConvertTo-Json -Depth 5)
  } catch {
    $resp = $_.Exception.Response
    $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
    return $reader.ReadToEnd()
  }
}

"T1 CTG + delivery_charge: " + (Order "t1" "Chattogram" "delivery_charge" $null | ConvertTo-Json -Compress)
"T2 Outside + delivery_charge: " + (Order "t2" "Dhaka" "delivery_charge" $null | ConvertTo-Json -Compress)
"T3 CTG + full_order: " + (Order "t3" "Chattogram" "full_order" $null | ConvertTo-Json -Compress)
"T4 Outside + full_order: " + (Order "t4" "Sylhet" "full_order" $null | ConvertTo-Json -Compress)
"T5 coupon TEST10: " + (Order "t5" "Chattogram" "full_order" "TEST10" | ConvertTo-Json -Compress)
"T6 expired coupon: " + (Order "t6" "Dhaka" "full_order" "EXPIRED123" | ConvertTo-Json -Compress)
"T7 invalid coupon: " + (Order "t7" "Dhaka" "full_order" "NOTACOUPON" | ConvertTo-Json -Compress)
"T8 price manipulation: " + (Order "t8" "Dhaka" "full_order" $null @{items=@(@{productId=$pid;variant="Standard";qty=1;price=1})} | ConvertTo-Json -Compress)
"T9 delivery charge manipulation: " + (Order "t9" "Dhaka" "full_order" $null @{shippingFee=5; deliveryCharge=5} | ConvertTo-Json -Compress)
"T10 international: " + (Order "t10" "Dubai" "full_order" $null | ConvertTo-Json -Compress)
"T11 invalid phone: " + (Order "t11" "Dhaka" "full_order" $null @{phone="12345"} | ConvertTo-Json -Compress)
"T12 duplicate submit: " + (Order "t12" "Dhaka" "full_order" $null @{clientRequestId="dup-test-123"} | ConvertTo-Json -Compress)
"T12b duplicate submit again: " + (Order "t12b" "Dhaka" "full_order" $null @{clientRequestId="dup-test-123"} | ConvertTo-Json -Compress)

