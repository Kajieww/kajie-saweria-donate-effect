--// KajieSaweriaClient.client.lua
--// Kajie Saweria Donate Effect - Client Script
--// Letakkan di: StarterPlayer > StarterPlayerScripts

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local RunService = game:GetService("RunService")
local Debris = game:GetService("Debris")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local root = ReplicatedStorage:WaitForChild("KajieSaweriaDonation")
local remote = root:WaitForChild("DonateEffectRemote")

local queue = {}
local isPlaying = false

local LEVEL_CONFIG = {
	[1] = {
		Duration = 4.5,
		Confetti = 28,
		Flash = 0,
		Shake = 0,
		Title = "KAJIE SPARK DONATE!",
	},
	[2] = {
		Duration = 5.5,
		Confetti = 56,
		Flash = 0.12,
		Shake = 0,
		Title = "KAJIE GOLD RAIN!",
	},
	[3] = {
		Duration = 6.5,
		Confetti = 90,
		Flash = 0.24,
		Shake = 0.08,
		Title = "KAJIE ROYAL BURST!",
	},
	[4] = {
		Duration = 7.5,
		Confetti = 150,
		Flash = 0.38,
		Shake = 0.16,
		Title = "KAJIE MEGA STORM!",
	},
}

local function formatRupiah(amount)
	amount = tonumber(amount) or 0
	local str = tostring(math.floor(amount))
	local result = str:reverse():gsub("(%d%d%d)", "%1."):reverse()

	if result:sub(1, 1) == "." then
		result = result:sub(2)
	end

	return "Rp" .. result
end

local function colorFromPayload(payload)
	local c = payload.Color

	if type(c) == "table" then
		return Color3.fromRGB(
				tonumber(c.R) or 255,
				tonumber(c.G) or 255,
				tonumber(c.B) or 255
		)
	end

	return Color3.fromRGB(56, 189, 248)
end

local function getGui()
	local old = playerGui:FindFirstChild("KajieSaweriaDonateGui")
	if old then
		return old
	end

	local gui = Instance.new("ScreenGui")
	gui.Name = "KajieSaweriaDonateGui"
	gui.IgnoreGuiInset = true
	gui.ResetOnSpawn = false
	gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
	gui.Parent = playerGui

	local overlay = Instance.new("Frame")
	overlay.Name = "Overlay"
	overlay.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
	overlay.BackgroundTransparency = 1
	overlay.BorderSizePixel = 0
	overlay.Size = UDim2.fromScale(1, 1)
	overlay.ZIndex = 50
	overlay.Parent = gui

	local card = Instance.new("Frame")
	card.Name = "Card"
	card.AnchorPoint = Vector2.new(0.5, 0)
	card.Position = UDim2.fromScale(0.5, -0.35)
	card.Size = UDim2.fromScale(0.62, 0.21)
	card.BackgroundColor3 = Color3.fromRGB(8, 13, 26)
	card.BackgroundTransparency = 0.04
	card.BorderSizePixel = 0
	card.Visible = false
	card.ZIndex = 60
	card.Parent = gui

	local cardSize = Instance.new("UISizeConstraint")
	cardSize.MinSize = Vector2.new(320, 120)
	cardSize.MaxSize = Vector2.new(780, 220)
	cardSize.Parent = card

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 26)
	corner.Parent = card

	local stroke = Instance.new("UIStroke")
	stroke.Name = "Stroke"
	stroke.Thickness = 3
	stroke.Color = Color3.fromRGB(56, 189, 248)
	stroke.Parent = card

	local gradient = Instance.new("UIGradient")
	gradient.Rotation = 35
	gradient.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(15, 23, 42)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(30, 41, 59)),
	})
	gradient.Parent = card

	local padding = Instance.new("UIPadding")
	padding.PaddingLeft = UDim.new(0.045, 0)
	padding.PaddingRight = UDim.new(0.045, 0)
	padding.PaddingTop = UDim.new(0.11, 0)
	padding.PaddingBottom = UDim.new(0.08, 0)
	padding.Parent = card

	local title = Instance.new("TextLabel")
	title.Name = "Title"
	title.BackgroundTransparency = 1
	title.Size = UDim2.fromScale(1, 0.26)
	title.Font = Enum.Font.GothamBlack
	title.TextScaled = true
	title.TextXAlignment = Enum.TextXAlignment.Center
	title.TextColor3 = Color3.fromRGB(255, 255, 255)
	title.Text = "KAJIE DONATE!"
	title.ZIndex = 61
	title.Parent = card

	local donor = Instance.new("TextLabel")
	donor.Name = "Donor"
	donor.BackgroundTransparency = 1
	donor.Position = UDim2.fromScale(0, 0.32)
	donor.Size = UDim2.fromScale(1, 0.27)
	donor.Font = Enum.Font.GothamBold
	donor.TextScaled = true
	donor.TextXAlignment = Enum.TextXAlignment.Center
	donor.TextColor3 = Color3.fromRGB(226, 232, 240)
	donor.Text = "Anonim donate Rp0"
	donor.ZIndex = 61
	donor.Parent = card

	local message = Instance.new("TextLabel")
	message.Name = "Message"
	message.BackgroundTransparency = 1
	message.Position = UDim2.fromScale(0, 0.63)
	message.Size = UDim2.fromScale(1, 0.22)
	message.Font = Enum.Font.GothamMedium
	message.TextScaled = true
	message.TextXAlignment = Enum.TextXAlignment.Center
	message.TextColor3 = Color3.fromRGB(203, 213, 225)
	message.Text = "Terima kasih!"
	message.ZIndex = 61
	message.Parent = card

	local level = Instance.new("TextLabel")
	level.Name = "Level"
	level.BackgroundTransparency = 1
	level.Position = UDim2.fromScale(0, 0.86)
	level.Size = UDim2.fromScale(1, 0.13)
	level.Font = Enum.Font.GothamBold
	level.TextScaled = true
	level.TextXAlignment = Enum.TextXAlignment.Center
	level.TextColor3 = Color3.fromRGB(147, 197, 253)
	level.Text = "Level 1 - Kajie Spark"
	level.ZIndex = 61
	level.Parent = card

	return gui
end

local function makeConfetti(gui, count, color)
	for _ = 1, count do
		local piece = Instance.new("Frame")
		piece.Name = "KajieConfetti"
		piece.AnchorPoint = Vector2.new(0.5, 0.5)
		piece.Size = UDim2.fromOffset(math.random(6, 14), math.random(8, 22))
		piece.Position = UDim2.fromScale(math.random(5, 95) / 100, -0.08)
		piece.Rotation = math.random(0, 360)
		piece.BorderSizePixel = 0
		piece.ZIndex = 55

		if math.random(1, 3) == 1 then
			piece.BackgroundColor3 = color
		else
			piece.BackgroundColor3 = Color3.fromHSV(math.random(), 0.75, 1)
		end

		piece.Parent = gui

		local corner = Instance.new("UICorner")
		corner.CornerRadius = UDim.new(0, 4)
		corner.Parent = piece

		local fallTime = math.random(20, 42) / 10
		local tween = TweenService:Create(
			piece,
			TweenInfo.new(fallTime, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
			{
				Position = UDim2.fromScale(math.random(2, 98) / 100, math.random(55, 105) / 100),
				Rotation = math.random(240, 900),
				BackgroundTransparency = 1,
			}
		)

		tween:Play()
		Debris:AddItem(piece, fallTime + 0.25)
	end
end

local function makeBurstRings(gui, color, level)
	local ringCount = math.clamp(level, 1, 4)

	for i = 1, ringCount do
		local ring = Instance.new("Frame")
		ring.Name = "KajieBurstRing"
		ring.AnchorPoint = Vector2.new(0.5, 0.5)
		ring.Position = UDim2.fromScale(0.5, 0.48)
		ring.Size = UDim2.fromOffset(40, 40)
		ring.BackgroundTransparency = 1
		ring.ZIndex = 54
		ring.Parent = gui

		local corner = Instance.new("UICorner")
		corner.CornerRadius = UDim.new(1, 0)
		corner.Parent = ring

		local stroke = Instance.new("UIStroke")
		stroke.Thickness = 4
		stroke.Color = color
		stroke.Transparency = 0.1
		stroke.Parent = ring

		local targetSize = 220 + (i * 130)
		local tween = TweenService:Create(
			ring,
			TweenInfo.new(0.9 + (i * 0.12), Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
			{ Size = UDim2.fromOffset(targetSize, targetSize) }
		)

		local fade = TweenService:Create(
			stroke,
			TweenInfo.new(0.9 + (i * 0.12), Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
			{ Transparency = 1 }
		)

		tween:Play()
		fade:Play()
		Debris:AddItem(ring, 1.6 + (i * 0.15))
	end
end

local function flashScreen(gui, strength, color)
	if strength <= 0 then
		return
	end

	local overlay = gui:WaitForChild("Overlay")
	overlay.BackgroundColor3 = color
	overlay.BackgroundTransparency = 1

	local show = TweenService:Create(
		overlay,
		TweenInfo.new(0.08, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
		{ BackgroundTransparency = math.clamp(1 - strength, 0.45, 0.95) }
	)

	local hide = TweenService:Create(
		overlay,
		TweenInfo.new(0.35, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
		{ BackgroundTransparency = 1 }
	)

	show:Play()
	show.Completed:Wait()
	hide:Play()
end

local function shakeCamera(power, duration)
	if power <= 0 then
		return
	end

	local camera = workspace.CurrentCamera
	if not camera then
		return
	end

	local start = os.clock()
	local connection

	connection = RunService.RenderStepped:Connect(function()
		local elapsed = os.clock() - start
		if elapsed >= duration then
			connection:Disconnect()
			return
		end

		local fade = 1 - (elapsed / duration)
		local offset = Vector3.new(
			(math.random() - 0.5) * power * fade,
			(math.random() - 0.5) * power * fade,
			0
		)

		camera.CFrame = camera.CFrame * CFrame.new(offset)
	end)
end

local function playDonationEffect(payload)
	local gui = getGui()
	local card = gui:WaitForChild("Card")

	local color = colorFromPayload(payload)
	local level = tonumber(payload.Level) or 1
	local config = LEVEL_CONFIG[level] or LEVEL_CONFIG[1]

	local title = card:WaitForChild("Title")
	local donor = card:WaitForChild("Donor")
	local message = card:WaitForChild("Message")
	local levelLabel = card:WaitForChild("Level")
	local stroke = card:WaitForChild("Stroke")

	title.Text = config.Title
	title.TextColor3 = color
	donor.Text = tostring(payload.Username or "Anonim") .. " donate " .. formatRupiah(payload.Amount)

	if tostring(payload.Message or "") ~= "" then
		message.Text = '"' .. tostring(payload.Message) .. '"'
	else
		message.Text = "Terima kasih sudah support Kajie!"
	end

	levelLabel.Text = "Level " .. tostring(level) .. " - " .. tostring(payload.LevelName or "Kajie Effect")
	levelLabel.TextColor3 = color
	stroke.Color = color

	card.Visible = true
	card.Position = UDim2.fromScale(0.5, -0.35)
	stroke.Thickness = 3

	makeConfetti(gui, config.Confetti, color)
	makeBurstRings(gui, color, level)

	task.spawn(function()
		flashScreen(gui, config.Flash, color)
	end)

	task.spawn(function()
		shakeCamera(config.Shake, 0.45)
	end)

	local tweenIn = TweenService:Create(
		card,
		TweenInfo.new(0.5, Enum.EasingStyle.Back, Enum.EasingDirection.Out),
		{ Position = UDim2.fromScale(0.5, 0.065) }
	)

	local pulseIn = TweenService:Create(
		stroke,
		TweenInfo.new(0.22, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
		{ Thickness = 7 }
	)

	local pulseOut = TweenService:Create(
		stroke,
		TweenInfo.new(0.22, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
		{ Thickness = 3 }
	)

	local tweenOut = TweenService:Create(
		card,
		TweenInfo.new(0.38, Enum.EasingStyle.Quad, Enum.EasingDirection.In),
		{ Position = UDim2.fromScale(0.5, -0.35) }
	)

	tweenIn:Play()
	tweenIn.Completed:Wait()

	for _ = 1, math.clamp(level, 1, 4) do
		pulseIn:Play()
		pulseIn.Completed:Wait()
		pulseOut:Play()
		pulseOut.Completed:Wait()
	end

	task.wait(config.Duration)
	tweenOut:Play()
	tweenOut.Completed:Wait()
	card.Visible = false
end

local function processQueue()
	if isPlaying then
		return
	end

	isPlaying = true

	while #queue > 0 do
		local payload = table.remove(queue, 1)
		local ok, err = pcall(function()
			playDonationEffect(payload)
		end)

		if not ok then
			warn("[KajieSaweriaClient] Effect error:", err)
		end

		task.wait(0.35)
	end

	isPlaying = false
end

remote.OnClientEvent:Connect(function(payload)
	table.insert(queue, payload)
	task.spawn(processQueue)
end)
