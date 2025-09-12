let textInput = document.getElementById("textInput");
let preview = document.getElementById("preview");

function saveToSessionStorage() {
  sessionStorage.setItem("textInput", textInput.value);
}

function loadFromSessionStorage() {
  const savedText = sessionStorage.getItem("textInput");
  if (savedText !== null) {
    textInput.value = savedText;
    updatePreview();
  }
}

function updatePreview() {
  let text = textInput.value;
  saveToSessionStorage(); // Tambahkan baris ini untuk menyimpan input

  if (!text.trim()) {
    preview.innerHTML =
      '<div style="color: #666; text-align: center; padding: 40px 20px;">Preview akan muncul di sini saat Anda mengetik...</div>';
    updateStats(text);
    return;
  }

  let formattedText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const lines = formattedText.split("\n");
  let resultHtml = "";
  let inList = false;
  let listType = "";

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    const isLineEmpty = line === "";

    if (inList && isLineEmpty) {
      resultHtml += `</${listType}>`;
      inList = false;
    }

    if (isLineEmpty) {
      resultHtml += '<p class="empty-line"></p>';
      return;
    }

    // Check for list items
    if (/^\d+\./.test(trimmedLine)) {
      if (!inList || listType !== "numbered") {
        if (inList) resultHtml += `</${listType}>`;
        resultHtml += "<ol>";
        inList = true;
        listType = "numbered";
      }
      const content = line.replace(/^\s*\d+\.\s*/, "").trim();
      resultHtml += `<li>${content}</li>`;
    } else if (trimmedLine.startsWith("•") || trimmedLine.startsWith("-")) {
      if (!inList || listType !== "bullet") {
        if (inList) resultHtml += `</${listType}>`;
        resultHtml += "<ul>";
        inList = true;
        listType = "bullet";
      }
      const content = line.replace(/^\s*[•\-]\s*/, "").trim();
      resultHtml += `<li>${content}</li>`;
    }
    // Check for quote block
    else if (trimmedLine.startsWith("&gt;")) {
      if (inList) {
        resultHtml += `</${listType}>`;
        inList = false;
      }
      const content = line.replace(/^\s*&gt;\s*/, "").trim();
      resultHtml += `<div class="quote">${content}</div>`;
    }
    // Regular line
    else {
      if (inList) {
        resultHtml += `</${listType}>`;
        inList = false;
      }
      resultHtml += `<p>${line}</p>`;
    }
  });

  if (inList) {
    resultHtml += `</${listType}>`;
  }

  // Order matters: Process monospace first, then underline, bold, italic, strikethrough
  resultHtml = resultHtml
    .replace(/```([^\s`][^`]*[^\s`])```/g, '<span class="monospace">$1</span>')
    .replace(/__([^\s_][^_]*[^\s_])__/g, '<span class="underline">$1</span>')
    .replace(/\*([^\s*][^*]*[^\s*])\*/g, '<span class="bold">$1</span>')
    .replace(/_([^\s_][^_]*[^\s_])_/g, '<span class="italic">$1</span>')
    .replace(/~([^\s~][^~]*[^\s~])~/g, '<span class="strikethrough">$1</span>');

  preview.innerHTML = resultHtml;
  updateStats(text);
}

function updateStats(text) {
  document.getElementById("charCount").textContent = text.length;
  document.getElementById("wordCount").textContent = text.trim()
    ? text.trim().split(/\s+/).length
    : 0;
  document.getElementById("lineCount").textContent = text.split("\n").length;
}

function applyFormat(format) {
  let start = textInput.selectionStart;
  let end = textInput.selectionEnd;
  let currentText = textInput.value;
  let selection = currentText.substring(start, end);

  const formatMap = {
    bold: { prefix: "*", suffix: "*", template: "" },
    italic: { prefix: "_", suffix: "_", template: "" },
    strikethrough: { prefix: "~", suffix: "~", template: "" },
    underline: { prefix: "__", suffix: "__", template: "" },
    monospace: { prefix: "```", suffix: "```", template: "" },
    quote: { prefix: "> ", suffix: "", template: "" },
    bullet: { prefix: "• ", suffix: "", template: "" },
    numbered: { prefix: "1. ", suffix: "", template: "item" },
  };

  const formatConfig = formatMap[format];
  let newText;

  if (selection.length === 0) {
    newText = formatConfig.prefix + formatConfig.template + formatConfig.suffix;
  } else if (
    format === "bullet" ||
    format === "numbered" ||
    format === "quote"
  ) {
    const lines = selection.split("\n");
    const formattedLines = lines.map((line) => {
      const trimmedLine = line.trim();
      const isFormatted = trimmedLine.startsWith(formatConfig.prefix.trim());
      const isNumbered = format === "numbered" && /^\d+\./.test(trimmedLine);

      if (isFormatted || isNumbered) {
        return line.replace(formatConfig.prefix, "").trim();
      } else {
        return formatConfig.prefix + trimmedLine;
      }
    });
    newText = formattedLines.join("\n");
  } else {
    const trimmedSelection = selection.trim();
    const isAlreadyFormatted =
      trimmedSelection.startsWith(formatConfig.prefix) &&
      trimmedSelection.endsWith(formatConfig.suffix);

    if (isAlreadyFormatted) {
      newText = trimmedSelection.slice(
        formatConfig.prefix.length,
        -formatConfig.suffix.length
      );
    } else {
      newText = `${formatConfig.prefix}${selection}${formatConfig.suffix}`;
    }
  }

  textInput.value =
    currentText.slice(0, start) + newText + currentText.slice(end);
  textInput.focus();

  if (selection.length === 0) {
    const cursorPosition =
      start + formatConfig.prefix.length + formatConfig.template.length;
    textInput.setSelectionRange(cursorPosition, cursorPosition);
  } else {
    textInput.setSelectionRange(start, start + newText.length);
  }

  updatePreview();
}

function insertEmoji(emoji) {
  let start = textInput.selectionStart;
  let end = textInput.selectionEnd;

  const before = textInput.value.substring(0, start);
  const after = textInput.value.substring(end);

  textInput.value = before + emoji + after;
  textInput.setSelectionRange(start + emoji.length, start + emoji.length);
  textInput.focus();
  updatePreview();
}

function clearText() {
  if (confirm("Hapus semua teks?")) {
    textInput.value = "";
    updatePreview();
    textInput.focus();
  }
}

function handlePaste(event) {
  event.preventDefault();

  const clipboardData = event.clipboardData || window.clipboardData;

  let pastedText = clipboardData.getData("text/plain");
  const htmlText = clipboardData.getData("text/html");

  if (htmlText) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlText;

    // Regular expression to identify formatted text
    const formattedRegex = new RegExp(
      `(<(b|strong)>[^<]+</(b|strong)>)|(<(i|em)>[^<]+</(i|em)>)|(<(u)>[^<]+</(u)>)|(<(s|del)>[^<]+</(s|del)>)|(<(code|pre)>[^<]+</(code|pre)>)`,
      "g"
    );

    // Find and replace HTML tags with their markdown equivalents
    const formattedMapping = {
      b: "*",
      strong: "*",
      i: "_",
      em: "_",
      u: "__",
      s: "~",
      del: "~",
      code: "```",
      pre: "```",
    };

    let tempPastedText = pastedText;

    // This regex is complex and may not handle all cases perfectly.
    // A simpler, more reliable approach is to use plain text as the source of truth.
    // We'll stick to a simpler, more direct approach that handles the core issue.

    // New logic: trust plainText for structure, use a DOM parser for formatting.
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");

    const getMarkdownFromNode = (node) => {
      let markdown = "";
      node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          markdown += child.nodeValue;
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const tag = child.tagName.toLowerCase();
          const content = getMarkdownFromNode(child);
          switch (tag) {
            case "b":
            case "strong":
              markdown += `*${content}*`;
              break;
            case "i":
            case "em":
              markdown += `_${content}_`;
              break;
            case "u":
              markdown += `__${content}__`;
              break;
            case "s":
            case "del":
              markdown += `~${content}~`;
              break;
            case "code":
            case "pre":
              markdown += `\`\`\`${content}\`\`\``;
              break;
            case "li":
              const parentTag = child.parentNode.tagName.toLowerCase();
              const marker =
                parentTag === "ul"
                  ? "•"
                  : Array.from(child.parentNode.children).indexOf(child) +
                    1 +
                    ".";
              markdown += `${marker} ${content}\n`;
              break;
            case "p":
              // Handle paragraph new lines correctly
              markdown += content + "\n\n";
              break;
            default:
              markdown += content;
          }
        }
      });
      return markdown.trim();
    };

    pastedText = getMarkdownFromNode(doc.body).trim();
  }

  let start = textInput.selectionStart;
  let end = textInput.selectionEnd;
  let currentText = textInput.value;

  textInput.value =
    currentText.slice(0, start) + pastedText + currentText.slice(end);
  textInput.setSelectionRange(
    start + pastedText.length,
    start + pastedText.length
  );

  updatePreview();
}

async function copyToClipboard() {
  let text = textInput.value;
  if (!text.trim()) {
    alert("Tidak ada teks untuk disalin!");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);

    let btn = document.querySelector(".copy-btn");
    let originalText = btn.innerHTML;
    btn.innerHTML = "✅ Berhasil Disalin!";
    btn.classList.add("copied");

    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.classList.remove("copied");
    }, 2000);
  } catch (err) {
    textInput.select();
    document.execCommand("copy");
    alert("Teks berhasil disalin ke clipboard!");
  }
}

textInput.addEventListener("keydown", function (e) {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case "b":
        e.preventDefault();
        applyFormat("bold");
        break;
      case "i":
        e.preventDefault();
        applyFormat("italic");
        break;
      case "u":
        e.preventDefault();
        applyFormat("underline");
        break;
    }
  } else if (e.key === "Enter") {
    let start = textInput.selectionStart;
    let beforeText = textInput.value.substring(0, start);
    let lines = beforeText.split("\n");
    let currentLine = lines[lines.length - 1];

    if (/^\s*(\d+)\.\s/.test(currentLine.trim())) {
      e.preventDefault();
      let match = currentLine.trim().match(/^(\s*)(\d+)\.\s/);
      let number = parseInt(match[2]) + 1;
      let newLine = `\n${match[1]}${number}. `;
      textInput.setRangeText(newLine, start, start, "end");
      setTimeout(updatePreview, 10);
    } else if (/^\s*[•\-]\s/.test(currentLine.trim())) {
      e.preventDefault();
      let match = currentLine.trim().match(/^(\s*)[•\-]\s/);
      let newLine = `\n${match[1]}• `;
      textInput.setRangeText(newLine, start, start, "end");
      setTimeout(updatePreview, 10);
    }
  }
});

// Panggil fungsi ini saat halaman dimuat
loadFromSessionStorage();
