$bytes = [System.IO.File]::ReadAllBytes('C:\Users\erick\OneDrive\Dokumenty\emapanadas\script.txt')
$text = [System.Text.Encoding]::Unicode.GetString($bytes)
[System.IO.File]::WriteAllText('C:\Users\erick\OneDrive\Dokumenty\emapanadas\script_utf8.txt', $text, [System.Text.Encoding]::UTF8)
Write-Host "Done converting"
