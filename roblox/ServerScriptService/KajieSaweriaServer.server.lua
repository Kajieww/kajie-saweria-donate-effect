--// KajieSaweriaServer.server.lua
--// Kajie Saweria Donate Effect - Server Script
--// Letakkan di: ServerScriptService

local MessagingService = game:GetService("MessagingService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")

local SYSTEM_NAME = "Kajie Saweria Donate Effect"
local TOPIC = "KAJIE_SAWERIA_DONATE_V1"

local LEVELS = {
	[1] = {
		Name = "Kajie Spark",
		Min = 10000,
		Max = 49999,
		Color = Color3.fromRGB(56, 189, 248),
	},
	[2] = {
		Name = "Kajie Gold Rain",
		Min = 50000,
		Max = 99999,
		Color = Color3.fromRGB(250, 204, 21),
	},
	[3] = {
		Name = "Kajie Royal Burst",
		Min = 100000,
		Max = 249999,
		Color = Color3.fromRGB(168, 85, 247),
	},
	[4] = {
		Name = "Kajie Mega Storm",
		Min = 250000,
		Max = math.huge,
		Color = Color3.fromRGB(251, 113, 133),
	},
}

local root = ReplicatedStorage:FindFirstChild("KajieSaweriaDonation")
if not root then
	root = Instance.new("Folder")
	root.Name = "KajieSaweriaDonation"
	root.Parent = ReplicatedStorage
end

local remote = root:FindFirstChild("DonateEffectRemote")
if not remote then
	remote = Instance.new("RemoteEvent")
	remote.Name = "DonateEffectRemote"
	remote.Parent = root
end

local processed = {}

local function cleanText(value, maxLength, fallback)
	value = tostring(value or "")
	value = value:gsub("[\r\n\t]", " ")
	value = value:gsub("[<>]", "")
	value = value:gsub("%s+", " ")
	value = value:sub(1, maxLength or 60)

	if value == "" then
		return fallback or ""
	end

	return value
end

local function safeAmount(value)
	value = tonumber(value) or 0
	value = math.floor(value)

	if value < 0 then
		value = 0
	end

	return value
end

local function getLevel(amount)
	for level, config in pairs(LEVELS) do
		if amount >= config.Min and amount <= config.Max then
			return level, config
		end
	end

	return 0, nil
end

local function colorToTable(color)
	return {
		R = math.floor(color.R * 255),
		G = math.floor(color.G * 255),
		B = math.floor(color.B * 255),
	}
end

local function fireDonationToClients(donationId, username, amount, message)
	local level, levelConfig = getLevel(amount)
	if level <= 0 or not levelConfig then
		return false, "Amount below minimum effect"
	end

	local payload = {
		System = SYSTEM_NAME,
		Id = cleanText(donationId, 100, "unknown"),
		Username = cleanText(username, 32, "Anonim"),
		Amount = safeAmount(amount),
		Message = cleanText(message, 100, ""),
		Level = level,
		LevelName = levelConfig.Name,
		Color = colorToTable(levelConfig.Color),
		Timestamp = os.time(),
	}

	print(("[KajieSaweria] %s donate %s | Level %d - %s"):format(
		payload.Username,
		tostring(payload.Amount),
		payload.Level,
		payload.LevelName
	))

	remote:FireAllClients(payload)
	return true, payload
end

local function handleDonation(rawMessage)
	local ok, data = pcall(function()
		return HttpService:JSONDecode(rawMessage)
	end)

	if not ok or type(data) ~= "table" then
		warn("[KajieSaweria] Payload tidak valid.")
		return
	end

	if data.sys ~= "KajieSaweria" then
		warn("[KajieSaweria] Payload bukan dari KajieSaweria.")
		return
	end

	local donationId = cleanText(data.id, 100, "unknown")
	if processed[donationId] then
		return
	end

	processed[donationId] = true
	task.delay(300, function()
		processed[donationId] = nil
	end)

	local amount = safeAmount(data.a)
	local username = cleanText(data.u, 32, "Anonim")
	local message = cleanText(data.m, 100, "")

	fireDonationToClients(donationId, username, amount, message)
end

local function subscribe()
	local ok, err = pcall(function()
		MessagingService:SubscribeAsync(TOPIC, function(message)
			if typeof(message.Data) == "string" then
				handleDonation(message.Data)
			else
				warn("[KajieSaweria] Message data bukan string.")
			end
		end)
	end)

	if ok then
		print("[KajieSaweria] Subscribe aktif:", TOPIC)
	else
		warn("[KajieSaweria] Gagal subscribe:", err)
	end
end

subscribe()

--// Test cepat di Roblox Studio Command Bar:
--// _G.KajieTestDonation("KajieFans", 250000, "Mantap Kajie!")
_G.KajieTestDonation = function(username, amount, message)
	local donationId = "studio-test-" .. tostring(math.floor(os.clock() * 1000))
	local ok, result = fireDonationToClients(
		donationId,
		username or "KajieTester",
		safeAmount(amount or 50000),
		message or "Test Kajie effect!"
	)

	if not ok then
		warn("[KajieSaweria] Test gagal:", result)
	end
end
