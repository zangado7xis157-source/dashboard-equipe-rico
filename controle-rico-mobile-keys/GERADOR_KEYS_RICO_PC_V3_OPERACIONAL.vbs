Option Explicit
Dim sh, fso, temp, ps1, http, url, file
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
temp = sh.ExpandEnvironmentStrings("%TEMP%") & "\GeradorKeysRicoV3.ps1"
url = "https://raw.githubusercontent.com/zangado7xis157-source/dashboard-equipe-rico/controle-rico-final/controle-rico-mobile-keys/GeradorKeysRicoV3.ps1"
On Error Resume Next
Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
http.Open "GET", url, False
http.Send
If Err.Number <> 0 Or http.Status <> 200 Then
  MsgBox "Nao foi possivel baixar o gerador atualizado. Verifique sua internet.", 16, "Gerador Rico"
  WScript.Quit
End If
On Error GoTo 0
Set file = fso.CreateTextFile(temp, True, True)
file.Write http.ResponseText
file.Close
sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & temp & """", 1, False
Set file = Nothing
Set http = Nothing
Set fso = Nothing
Set sh = Nothing
