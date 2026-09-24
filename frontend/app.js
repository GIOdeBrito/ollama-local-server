"use strict";

/* Local-only chat UI. Why no network here: backend wiring is explicitly out of scope. */

const MAX_MESSAGE_LENGTH = 2000;
const SEED_MESSAGES = Object.freeze([
	Object.freeze({
		role: "system",
		text: "Welcome to Ollama Chat. Backend is not connected - messages stay in this window only."
	}),
	Object.freeze({
		role: "assistant",
		text: "Hello! I am a local UI preview. Ask me anything - sending will echo locally for layout testing."
	})
]);

function isNonEmptyString (value)
{
	return typeof value === "string" && value.trim().length > 0;
}

function getTrimmedInput (inputElement)
{
	if (inputElement === null || inputElement === undefined) {
		return "";
	}

	if (typeof inputElement.value !== "string") {
		return "";
	}

	return inputElement.value.trim().slice(0, MAX_MESSAGE_LENGTH);
}

function formatMessageTime (dateValue)
{
	if (!(dateValue instanceof Date)) {
		return "";
	}

	return dateValue.toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit"
	});
}

function labelForRole (role)
{
	if (role === "user") {
		return "You";
	}

	if (role === "assistant") {
		return "Ollama (preview)";
	}

	return "System";
}

function buildMessageRow (role, text, timeLabel)
{
	const safeRole = isNonEmptyString(role) ? role.trim() : "system";
	const row = document.createElement("div");
	const box = document.createElement("div");
	const head = document.createElement("div");
	const body = document.createElement("div");
	const time = document.createElement("div");

	// Why textContent: prevents HTML injection without manual entity juggling.
	row.className = "msg-row msg-row-" + safeRole;
	box.className = "msg-box msg-" + safeRole;
	head.className = "msg-head";
	body.className = "msg-body";
	time.className = "msg-time";

	head.textContent = labelForRole(safeRole);
	body.textContent = text;
	time.textContent = timeLabel;

	box.appendChild(head);
	box.appendChild(body);
	box.appendChild(time);
	row.appendChild(box);

	return row;
}

function scrollLogToBottom (scrollContainer)
{
	if (scrollContainer === null || scrollContainer === undefined) {
		return;
	}

	scrollContainer.scrollTop = scrollContainer.scrollHeight;
}

function appendMessage (elements, role, text)
{
	if (elements === null || elements === undefined) {
		return;
	}

	if (!isNonEmptyString(text)) {
		return;
	}

	const timeLabel = formatMessageTime(new Date());
	const row = buildMessageRow(role, text.trim(), timeLabel);

	elements.log.appendChild(row);
	scrollLogToBottom(elements.scroll);
}

function updateCharCount (elements)
{
	if (elements === null || elements === undefined) {
		return;
	}

	const currentLength = typeof elements.input.value === "string" ? elements.input.value.length : 0;

	elements.charCount.textContent = currentLength + " / " + MAX_MESSAGE_LENGTH;
}

function updateStatus (elements, message)
{
	if (elements === null || elements === undefined) {
		return;
	}

	if (!isNonEmptyString(message)) {
		return;
	}

	elements.status.textContent = message;
}

function appendLocalPreviewReply (elements)
{
	if (elements === null || elements === undefined) {
		return;
	}

	const previewText = "Preview reply: backend wiring comes next, so this is layout-only.";

	appendMessage(elements, "assistant", previewText);
}

function handleSend (elements)
{
	if (elements === null || elements === undefined) {
		return;
	}

	const messageText = getTrimmedInput(elements.input);

	if (!isNonEmptyString(messageText)) {
		updateStatus(elements, "Type a message first.");
		return;
	}

	appendMessage(elements, "user", messageText);
	elements.input.value = "";
	updateCharCount(elements);
	updateStatus(elements, "Message added locally. Backend not wired.");

	// TODO/backend: replace local echo with queued request when API is defined.
	appendLocalPreviewReply(elements);
}

function handleClear (elements)
{
	if (elements === null || elements === undefined) {
		return;
	}

	elements.log.replaceChildren();
	updateStatus(elements, "Conversation cleared locally.");
	elements.input.focus();
}

function handleNewChat (elements)
{
	if (elements === null || elements === undefined) {
		return;
	}

	elements.log.replaceChildren();
	renderSeedMessages(elements);
	updateStatus(elements, "New local chat started.");
	elements.input.focus();
}

function renderSeedMessages (elements)
{
	if (elements === null || elements === undefined) {
		return;
	}

	for (const seed of SEED_MESSAGES) {
		appendMessage(elements, seed.role, seed.text);
	}
}

function collectElements ()
{
	const scroll = document.getElementById("chat-scroll");
	const log = document.getElementById("chat-log");
	const input = document.getElementById("composer-input");
	const sendButton = document.getElementById("send-btn");
	const clearButton = document.getElementById("clear-btn");
	const newChatButton = document.getElementById("new-chat-btn");
	const status = document.getElementById("status-text");
	const charCount = document.getElementById("char-count");

	if (scroll === null || log === null || input === null) {
		return null;
	}

	if (sendButton === null || clearButton === null || newChatButton === null) {
		return null;
	}

	if (status === null || charCount === null) {
		return null;
	}

	return Object.freeze({
		scroll,
		log,
		input,
		sendButton,
		clearButton,
		newChatButton,
		status,
		charCount
	});
}

function bindEvents (elements)
{
	if (elements === null) {
		return;
	}

	elements.sendButton.addEventListener("click", () => {
		handleSend(elements);
	});

	elements.clearButton.addEventListener("click", () => {
		handleClear(elements);
	});

	elements.newChatButton.addEventListener("click", () => {
		handleNewChat(elements);
	});

	elements.input.addEventListener("input", () => {
		updateCharCount(elements);
	});

	elements.input.addEventListener("keydown", (event) => {
		if (event.key !== "Enter") {
			return;
		}

		if (event.shiftKey) {
			return;
		}

		event.preventDefault();
		handleSend(elements);
	});
}

function initChatApp ()
{
	const elements = collectElements();

	if (elements === null) {
		return;
	}

	bindEvents(elements);
	renderSeedMessages(elements);
	updateCharCount(elements);
	updateStatus(elements, "Ready. Backend not connected.");
}

document.addEventListener("DOMContentLoaded", () => {
	initChatApp();
});
