Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$api = 'https://controle-rico-keys-mobile.onrender.com/api/generate'

function Invoke-KeyApi([hashtable]$data) {
    if ([string]::IsNullOrWhiteSpace($pinBox.Text)) { throw 'Digite a senha do gerador.' }
    $data.pin = $pinBox.Text.Trim()
    $json = $data | ConvertTo-Json -Compress
    $r = Invoke-RestMethod -Method Post -Uri $api -ContentType 'application/json' -Body $json -TimeoutSec 30
    if (-not $r.ok) { throw ([string]$r.message) }
    return $r
}

function New-Page([string]$name) {
    $p = New-Object System.Windows.Forms.TabPage
    $p.Text = $name
    $p.BackColor = [System.Drawing.Color]::FromArgb(18,24,35)
    $p.ForeColor = [System.Drawing.Color]::White
    [void]$tabs.TabPages.Add($p)
    return $p
}
function New-KeyBox($page) {
    $b = New-Object System.Windows.Forms.TextBox
    $b.Location = New-Object System.Drawing.Point(24,245)
    $b.Size = New-Object System.Drawing.Size(675,55)
    $b.Multiline = $true
    $b.ReadOnly = $true
    $b.Font = New-Object System.Drawing.Font('Consolas',10,[System.Drawing.FontStyle]::Bold)
    $page.Controls.Add($b)
    return $b
}
function Add-CopyButton($page,$box,[string]$text) {
    $b = New-Object System.Windows.Forms.Button
    $b.Text = $text
    $b.Location = New-Object System.Drawing.Point(24,320)
    $b.Size = New-Object System.Drawing.Size(675,42)
    $b.BackColor = [System.Drawing.Color]::FromArgb(34,106,210)
    $b.ForeColor = [System.Drawing.Color]::White
    $b.FlatStyle = 'Flat'
    $b.Add_Click({ if ($box.Text) { [System.Windows.Forms.Clipboard]::SetText($box.Text.Trim()) } }.GetNewClosure())
    $page.Controls.Add($b)
}

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Rico China - Central de Keys V3'
$form.StartPosition = 'CenterScreen'
$form.Size = New-Object System.Drawing.Size(820,690)
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.BackColor = [System.Drawing.Color]::FromArgb(13,17,26)
$form.ForeColor = [System.Drawing.Color]::White
$form.Font = New-Object System.Drawing.Font('Segoe UI',10)

$title = New-Object System.Windows.Forms.Label
$title.Text = 'GERADOR DE KEYS - RICO CHINA'
$title.Font = New-Object System.Drawing.Font('Segoe UI',21,[System.Drawing.FontStyle]::Bold)
$title.ForeColor = [System.Drawing.Color]::FromArgb(64,145,255)
$title.AutoSize = $true
$title.Location = New-Object System.Drawing.Point(28,18)
$form.Controls.Add($title)
$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = 'Bot + Dashboard + Download + Operacional Equipe Rico'
$subtitle.ForeColor = [System.Drawing.Color]::FromArgb(150,165,188)
$subtitle.AutoSize = $true
$subtitle.Location = New-Object System.Drawing.Point(31,58)
$form.Controls.Add($subtitle)
$pinLabel = New-Object System.Windows.Forms.Label
$pinLabel.Text = 'Senha do gerador (somente administradores)'
$pinLabel.AutoSize = $true
$pinLabel.Location = New-Object System.Drawing.Point(31,92)
$form.Controls.Add($pinLabel)
$pinBox = New-Object System.Windows.Forms.TextBox
$pinBox.Location = New-Object System.Drawing.Point(31,116)
$pinBox.Size = New-Object System.Drawing.Size(735,28)
$pinBox.UseSystemPasswordChar = $true
$form.Controls.Add($pinBox)
$tabs = New-Object System.Windows.Forms.TabControl
$tabs.Location = New-Object System.Drawing.Point(28,160)
$tabs.Size = New-Object System.Drawing.Size(740,430)
$form.Controls.Add($tabs)

# BOT
$tabBot = New-Page 'KEY BOT'
$l=New-Object System.Windows.Forms.Label;$l.Text='ID do PC do cliente';$l.AutoSize=$true;$l.Location=New-Object System.Drawing.Point(24,28);$tabBot.Controls.Add($l)
$botId=New-Object System.Windows.Forms.TextBox;$botId.Location=New-Object System.Drawing.Point(24,54);$botId.Size=New-Object System.Drawing.Size(675,28);$tabBot.Controls.Add($botId)
$l=New-Object System.Windows.Forms.Label;$l.Text='Validade';$l.AutoSize=$true;$l.Location=New-Object System.Drawing.Point(24,105);$tabBot.Controls.Add($l)
$botPlan=New-Object System.Windows.Forms.ComboBox;$botPlan.Location=New-Object System.Drawing.Point(24,131);$botPlan.Size=New-Object System.Drawing.Size(260,30);$botPlan.DropDownStyle='DropDownList';[void]$botPlan.Items.Add('Diária - 1 dia');[void]$botPlan.Items.Add('Semanal - 7 dias');[void]$botPlan.Items.Add('Mensal - 30 dias');$botPlan.SelectedIndex=2;$tabBot.Controls.Add($botPlan)
$botGen=New-Object System.Windows.Forms.Button;$botGen.Text='GERAR KEY DO BOT';$botGen.Location=New-Object System.Drawing.Point(310,129);$botGen.Size=New-Object System.Drawing.Size(389,36);$botGen.BackColor=[System.Drawing.Color]::FromArgb(0,165,92);$botGen.ForeColor=[System.Drawing.Color]::White;$botGen.FlatStyle='Flat';$tabBot.Controls.Add($botGen)
$botKey=New-KeyBox $tabBot
$botGen.Add_Click({try{$p=@('daily','weekly','monthly')[$botPlan.SelectedIndex];$r=Invoke-KeyApi @{mode='bot';deviceId=$botId.Text.Trim();plan=$p};$botKey.Text=[string]$r.keys[0]}catch{[System.Windows.Forms.MessageBox]::Show($_.Exception.Message,'Gerador')|Out-Null}})
Add-CopyButton $tabBot $botKey 'COPIAR KEY DO BOT'

# DASHBOARD
$tabDash = New-Page 'KEY DASHBOARD'
$i=New-Object System.Windows.Forms.Label;$i.Text='Key para o Dashboard CPA Equipe Rico.';$i.AutoSize=$true;$i.Location=New-Object System.Drawing.Point(24,28);$tabDash.Controls.Add($i)
$dPlan=New-Object System.Windows.Forms.ComboBox;$dPlan.Location=New-Object System.Drawing.Point(24,85);$dPlan.Size=New-Object System.Drawing.Size(260,30);$dPlan.DropDownStyle='DropDownList';[void]$dPlan.Items.Add('Mensal - 30 dias');[void]$dPlan.Items.Add('Vitalícia');$dPlan.SelectedIndex=0;$tabDash.Controls.Add($dPlan)
$dLabel=New-Object System.Windows.Forms.TextBox;$dLabel.Location=New-Object System.Drawing.Point(310,85);$dLabel.Size=New-Object System.Drawing.Size(389,28);$tabDash.Controls.Add($dLabel)
$dGen=New-Object System.Windows.Forms.Button;$dGen.Text='GERAR KEY DO DASHBOARD';$dGen.Location=New-Object System.Drawing.Point(24,145);$dGen.Size=New-Object System.Drawing.Size(675,42);$dGen.BackColor=[System.Drawing.Color]::FromArgb(0,165,92);$dGen.ForeColor=[System.Drawing.Color]::White;$dGen.FlatStyle='Flat';$tabDash.Controls.Add($dGen)
$dKey=New-KeyBox $tabDash
$dGen.Add_Click({try{$p=if($dPlan.SelectedIndex-eq 1){'lifetime'}else{'monthly'};$r=Invoke-KeyApi @{mode='dashboard';plan=$p;label=$dLabel.Text.Trim()};$dKey.Text=[string]$r.keys[0]}catch{[System.Windows.Forms.MessageBox]::Show($_.Exception.Message,'Gerador')|Out-Null}})
Add-CopyButton $tabDash $dKey 'COPIAR KEY DO DASHBOARD'

# DOWNLOAD
$tabDown = New-Page 'KEY DOWNLOAD SITE'
$i=New-Object System.Windows.Forms.Label;$i.Text='Libera o download do Controle Rico no site. Uso único.';$i.AutoSize=$true;$i.Location=New-Object System.Drawing.Point(24,28);$tabDown.Controls.Add($i)
$downLabel=New-Object System.Windows.Forms.TextBox;$downLabel.Location=New-Object System.Drawing.Point(24,85);$downLabel.Size=New-Object System.Drawing.Size(470,28);$tabDown.Controls.Add($downLabel)
$downCount=New-Object System.Windows.Forms.ComboBox;$downCount.Location=New-Object System.Drawing.Point(520,85);$downCount.Size=New-Object System.Drawing.Size(179,30);$downCount.DropDownStyle='DropDownList';[void]$downCount.Items.Add('1');[void]$downCount.Items.Add('5');[void]$downCount.Items.Add('10');$downCount.SelectedIndex=0;$tabDown.Controls.Add($downCount)
$downGen=New-Object System.Windows.Forms.Button;$downGen.Text='GERAR KEY DE DOWNLOAD';$downGen.Location=New-Object System.Drawing.Point(24,145);$downGen.Size=New-Object System.Drawing.Size(675,42);$downGen.BackColor=[System.Drawing.Color]::FromArgb(205,34,48);$downGen.ForeColor=[System.Drawing.Color]::White;$downGen.FlatStyle='Flat';$tabDown.Controls.Add($downGen)
$downKey=New-KeyBox $tabDown
$downGen.Add_Click({try{$r=Invoke-KeyApi @{mode='download';count=[int]$downCount.SelectedItem;label=$downLabel.Text.Trim()};$downKey.Text=($r.keys-join[Environment]::NewLine)}catch{[System.Windows.Forms.MessageBox]::Show($_.Exception.Message,'Gerador')|Out-Null}})
Add-CopyButton $tabDown $downKey 'COPIAR KEY(S) DE DOWNLOAD'

# OPERACIONAL
$tabOp = New-Page 'KEY OPERACIONAL EQUIPE RICO'
$i=New-Object System.Windows.Forms.Label;$i.Text='Acesso ao site de vídeos. A key fica vinculada ao primeiro dispositivo.';$i.ForeColor=[System.Drawing.Color]::FromArgb(155,175,205);$i.Size=New-Object System.Drawing.Size(675,40);$i.Location=New-Object System.Drawing.Point(24,24);$tabOp.Controls.Add($i)
$oPlan=New-Object System.Windows.Forms.ComboBox;$oPlan.Location=New-Object System.Drawing.Point(24,85);$oPlan.Size=New-Object System.Drawing.Size(260,30);$oPlan.DropDownStyle='DropDownList';[void]$oPlan.Items.Add('Mensal - 30 dias');[void]$oPlan.Items.Add('Vitalícia');$oPlan.SelectedIndex=0;$tabOp.Controls.Add($oPlan)
$oLabel=New-Object System.Windows.Forms.TextBox;$oLabel.Location=New-Object System.Drawing.Point(310,85);$oLabel.Size=New-Object System.Drawing.Size(389,28);$tabOp.Controls.Add($oLabel)
$oGen=New-Object System.Windows.Forms.Button;$oGen.Text='GERAR KEY DO OPERACIONAL';$oGen.Location=New-Object System.Drawing.Point(24,145);$oGen.Size=New-Object System.Drawing.Size(675,42);$oGen.BackColor=[System.Drawing.Color]::FromArgb(205,34,48);$oGen.ForeColor=[System.Drawing.Color]::White;$oGen.FlatStyle='Flat';$tabOp.Controls.Add($oGen)
$oKey=New-KeyBox $tabOp
$oGen.Add_Click({try{$p=if($oPlan.SelectedIndex-eq 1){'lifetime'}else{'monthly'};$r=Invoke-KeyApi @{mode='operacional';plan=$p;label=$oLabel.Text.Trim()};$oKey.Text=[string]$r.keys[0]}catch{[System.Windows.Forms.MessageBox]::Show($_.Exception.Message,'Gerador')|Out-Null}})
Add-CopyButton $tabOp $oKey 'COPIAR KEY DO OPERACIONAL'

$footer=New-Object System.Windows.Forms.Label;$footer.Text='ADMIN: mantenha este gerador somente com você e seu sócio.';$footer.ForeColor=[System.Drawing.Color]::FromArgb(150,165,188);$footer.Location=New-Object System.Drawing.Point(31,610);$footer.Size=New-Object System.Drawing.Size(720,28);$form.Controls.Add($footer)
[System.Windows.Forms.Application]::Run($form)
