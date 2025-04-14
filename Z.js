const chatContainer = document.getElementById('chat-container');
        const userInput = document.getElementById('user-input');
        const sendButton = document.getElementById('send-button');
        const voiceButton = document.getElementById('voice-button');
        const fileUploadButton = document.getElementById('file');
        const botAvatarUrl = "https://assets.onecompiler.app/4398w3ppx/43bsja34j/1000018777.png";
        const errorDiv = document.getElementById('error');
        const generatedImagesContainer = document.getElementById('generatedImagesContainer');
        const newChatButton = document.getElementById('newchat');
        const suggestionList = document.getElementById('suggestion-list');
        const suggestionContainer = document.querySelector('.suggestion-container');
        const hButton = document.getElementById('h');
        const searchPopup = document.getElementById('search-popup');
        const reasoningButton = document.getElementById('reasoning-button');
        let chatbotName = "z01";
        let username = "zayanai_12";
        const vectorShiftApiKey = "sk_iVi2k5KSD8o8gGeJ3acJeYFH9o9AZUNvFMIaUYwfHsAFx01k";
        const secondVectorShiftApiKey = "sk_TfH0501pnMxcOtflFBToXnqifTGfeBxDrUoUajbTWHFAEreI";
        const thirdVectorShiftApiKey = "sk_eKnwrVblY1FdVVyyqpdJ9JC3p1jPxGnVrFRLu8fydy6Sp6Bn";
        const fourthVectorShiftApiKey = "sk_cwB6kRrRKW6qIc8P4lEFpJHpT11MQD0K1oUk31uoeMG7cEXy";
        const fifthVectorShiftApiKey = "YOUR_5TH_VECTORS_SHIFT_API_KEY";
        const sixthVectorShiftApiKey = "YOUR_6TH_VECTORS_SHIFT_API_KEY";
        const seventhVectorShiftApiKey = "YOUR_7TH_VECTORS_SHIFT_API_KEY";
        const pexelsApiKey = "IpBPfHmCoj28Y9Zgk9AaLxc9lYZmaJ5y7CwwbZq7wpsbaV3WddRTQVeS";
        const MAX_PEXELS_PAGES = 100;
        let conversationId = null;
        let thinkingIndicator = null;
        let usedVideoIds = new Set();
        let usedImageIds = new Set();
        let currentPexelsVideoPage = 1;
        let currentPexelsImagePage = 20;
        const videosPerPage = 30;
        const imagesPerPage = 30;
        let useSecondApi = false;
        let useReasoningApi = false;
        let uploadedImageBase64 = null;
        let imageQuestionCount = 0;
        const maxImageQuestions = 6;
        let isGeneratingVideo = false;
        let selectedSearchMode = null;
        sendButton.originalHTML = sendButton.innerHTML;
        sendButton.originalClasses = sendButton.className;
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        fileInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                uploadedImageBase64 = e.target.result;
                imageQuestionCount = 0;
                addMessage("", true, uploadedImageBase64);
                userInput.focus();
                hideSuggestions();
            };
            reader.readAsDataURL(file);
        });
        fileUploadButton.addEventListener('click', function() {
            fileInput.click();
        });
        const geminiApiKey = 'AIzaSyBmYac_NDJaWf6lqD2va26ADYOOrBFpQao';

        async function askGeminiAboutImage(imageBase64, question) {
            showThinkingIndicator('thinking');
            try {
                const base64Data = imageBase64.split(',')[1];
                if (!base64Data) throw new Error("Invalid image data.");
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: question },
                                { inline_data: { mime_type: 'image/jpeg', data: base64Data } }
                            ]
                        }]
                    })
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Gemini API Error: ${response.status} - ${errorData.error?.message || "Unknown error"}`);
                }
                const data = await response.json();
                if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
                    return data.candidates[0].content.parts[0].text;
                } else {
                    throw new Error("Unexpected response format from Gemini API.");
                }
            } catch (error) {
                console.error('Error with Gemini API:', error);
                addMessage(`Error understanding image: ${error.message}`, false);
                return null;
            } finally {
                removeThinkingIndicator();
            }
        }

        function loadSuggestions() {
            const suggestions = [
                ["👨‍💻 Create HTML webpage"],
                ["🔍  Search video of Sunset.", "🔍 Search image of moon"],
                ["🐽 Generate image of cloud", "📽 Generate video of a cartoon"]
            ];
            suggestionList.innerHTML = '';
            suggestions.forEach(function(row) {
                const rowDiv = document.createElement('div');
                rowDiv.classList.add('suggestion-row');
                row.forEach(function(suggestion) {
                    const button = document.createElement('button');
                    button.textContent = suggestion;
                    button.setAttribute('aria-label', `Suggest ${suggestion}`);
                    button.setAttribute('role', 'option');
                    button.addEventListener('click', function() {
                        userInput.value = suggestion;
                        sendButton.click();
                        hideSuggestions();
                    });
                    rowDiv.appendChild(button);
                });
                suggestionList.appendChild(rowDiv);
            });
            suggestionContainer.classList.remove('hidden');
        }

        function hideSuggestions() {
            suggestionContainer.classList.add('hidden');
        }

        function addMessage(message, isUser, imageSrc = null, iframeSrc = null) {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('flex', 'mb-2');
            if (isUser) messageDiv.classList.add('justify-end');
            else messageDiv.classList.add('justify-start');

            const messageContent = document.createElement('div');
            messageContent.classList.add('rounded-xl', 'px-4', 'py-2', 'text-sm', 'message-content', isUser ? 'user-message' : 'ai-response');

            const responseContainer = document.createElement('div');
            responseContainer.style.display = 'flex';
            responseContainer.style.flexDirection = 'column';

            if (imageSrc) {
                const imgElement = document.createElement('img');
                imgElement.src = imageSrc;
                imgElement.alt = "Uploaded or Generated Image";
                imgElement.classList.add('generated-image');
                imgElement.style.maxWidth = '100%';
                imgElement.style.height = 'auto';
                responseContainer.appendChild(imgElement);
            } else if (iframeSrc && !isUser) {
                const iframeElement = document.createElement('iframe');
                iframeElement.src = iframeSrc;
                iframeElement.classList.add('generated-iframe');
                iframeElement.style.width = '100%';
                iframeElement.style.height = '350px';
                iframeElement.style.border = '2px solid #0091ea';
                iframeElement.title = "Image Generation Form";
                responseContainer.appendChild(iframeElement);
            } else if (!isUser){
                const equationRegex = /\$\$([\s\S]+?)\$\$|\$([\s\S]+?)\$/g;
                const textWithEquations = message.replace(equationRegex, function(match, doubleDollar, singleDollar) {
                    const equation = doubleDollar || singleDollar;
                    return `<img src="https://latex.codecogs.com/png.latex?\\dpi{120}\\${encodeURIComponent(equation.trim())}" alt="Equation" style="vertical-align: middle;">`;
                });
                const parsedMessage = marked.parse(textWithEquations, { breaks: true });
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = parsedMessage;

                Array.from(tempDiv.childNodes).forEach(function(node) {
                    if (node.nodeType === 3 && node.textContent.trim()) {
                        const words = node.textContent.split(/\s+/);
                        const wordContainer = document.createElement('span');
                        words.forEach(function(word, index) {
                            if (word.trim()) {
                                const wordSpan = document.createElement('span');
                                wordSpan.classList.add('fade-in-word');
                                wordSpan.style.animationDelay = `${index * 0.1}s`;
                                wordSpan.textContent = word + ' ';
                                wordContainer.appendChild(wordSpan);
                            }
                        });
                        responseContainer.appendChild(wordContainer);
                    } else if (node.nodeName === 'PRE' && node.querySelector('code')) {
                        const codeWrapper = document.createElement('div');
                        codeWrapper.classList.add('code-block-wrapper');
                        const codeDiv = document.createElement('div');
                        codeDiv.classList.add('transparent-code-block');
                        const preElement = document.createElement('pre');
                        const codeElement = document.createElement('code');
                        const codeText = node.querySelector('code').textContent.trim();
                        codeElement.textContent = codeText;
                        codeElement.className = 'language-html';
                        preElement.appendChild(codeElement);
                        codeDiv.appendChild(preElement);
                        Prism.highlightElement(codeElement);

                        const copyButton = document.createElement('button');
                        copyButton.classList.add('code-copy-button');
                        copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
                        copyButton.addEventListener('click', function() {
                            navigator.clipboard.writeText(codeText).then(function() {
                                copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><polyline points="20 6 9 17 4 12"/></svg>';
                                setTimeout(function() {
                                    copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
                                }, 2000);
                            }).catch(function(err) {
                                console.error('Failed to copy: ', err);
                            });
                        });

                        const playButton = document.createElement('button');
                        playButton.classList.add('code-play-button');
                        playButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-playstation" viewBox="0 0 16 16"><path d="M15.858 11.451c-.313.395-1.079.676-1.079.676l-5.696 2.046v-1.509l4.192-1.493c.476-.17.549-.412.162-.538-.386-.127-1.085-.09-1.56.08l-2.794.984v-1.566l.161-.054s.807-.286 1.942-.412c1.135-.125 2.525.017 3.616.43 1.23.39 1.368.962 1.056 1.356M9.625 8.883v-3.86c0-.453-.083-.87-.508-.988-.326-.105-.528.198-.528.65v9.664l-2.606-.827V2c1.108.206 2.722.692 3.59.985 2.207.757 2.955 1.7 2.955 3.825 0 2.071-1.278 2.856-2.903 2.072Zm-8.424 3.625C-.061 12.15-.271 11.41.304 10.984c.532-.394 1.436-.69 1.436-.69l3.737-1.33v1.515l-2.69.963c-.474.17-.547.411-.161.538.386.126 1.085.09 1.56-.08l1.29-.469v1.356l-.257.043a8.45 8.45 0 0 1-4.018-.323Z"/></svg>';
                        playButton.addEventListener('click', function() {
                            try {
                                const fullHtml = `
                                    <!DOCTYPE html>
                                    <html lang="en">
                                    <head>
                                        <meta charset="UTF-8">
                                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                        <title>Code Preview</title>
                                    </head>
                                    <body>
                                        ${codeText}
                                    </body>
                                    </html>
                                `;
                                const blob = new Blob([fullHtml], { type: 'text/html' });
                                const blobUrl = URL.createObjectURL(blob);
                                const modal = document.createElement('div');
                                modal.classList.add('modal');
                                modal.innerHTML = `
                                    <div class="modal-content">
                                        <button class="modal-close"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-octagon-fill" viewBox="0 0 16 16"><path d="M11.46.146A.5.5 0 0 0 11.107 0H4.893a.5.5 0 0 0-.353.146L.146 4.54A.5.5 0 0 0 0 4.893v6.214a.5.5 0 0 0 .146.353l4.394 4.394a.5.5 0 0 0 .353.146h6.214a.5.5 0 0 0 .353-.146l4.394-4.394a.5.5 0 0 0 .146-.353V4.893a.5.5 0 0 0-.146-.353zm-6.106 4.5L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 1 1 .708-.708"/>
</svg></button>
                                        <div class="modal-preview">
                                            <iframe src="${blobUrl}" sandbox="allow-scripts allow-same-origin"></iframe>
                                        </div>
                                    </div>
                                `;
                                document.body.appendChild(modal);
                                modal.style.display = 'flex';
                                const closeButton = modal.querySelector('.modal-close');
                                closeButton.addEventListener('click', function() {
                                    URL.revokeObjectURL(blobUrl);
                                    modal.remove();
                                });
                                modal.addEventListener('click', function(e) {
                                    if (e.target === modal) {
                                        URL.revokeObjectURL(blobUrl);
                                        modal.remove();
                                    }
                                });
                            } catch (error) {
                                console.error('Error displaying code preview:', error);
                                addMessage(`Failed to display code preview: ${error.message}`, false);
                            }
                        });

                        codeWrapper.appendChild(codeDiv);
                        codeWrapper.appendChild(copyButton);
                        codeWrapper.appendChild(playButton);
                        responseContainer.appendChild(codeWrapper);
                    } else {
                        responseContainer.appendChild(node.cloneNode(true));
                    }
                });

                if (tempDiv.childNodes.length > 0) {
                    const copyAllButton = document.createElement('button');
                    copyAllButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
                    copyAllButton.setAttribute('aria-label', 'Copy entire AI response to clipboard');
                    copyAllButton.style.marginTop = '0.5rem';
                    copyAllButton.style.alignSelf = 'flex-start';
                    copyAllButton.style.padding = '0.25rem';
                    copyAllButton.addEventListener('click', function() {
                        navigator.clipboard.writeText(message).then(function() {
                            copyAllButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><polyline points="20 6 9 17 4 12"/></svg>';
                            setTimeout(function() {
                                copyAllButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
                            }, 2000);
                        }).catch(function(err) {
                            console.error('Failed to copy: ', err);
                        });
                    });
                    responseContainer.appendChild(copyAllButton);
                }
            } else {
                responseContainer.textContent = message;
            }

            messageContent.appendChild(responseContainer);
            messageDiv.appendChild(messageContent);
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            return messageContent;
        }

        function showThinkingIndicator(type = 'thinking') {
            if (thinkingIndicator && thinkingIndicator.parentNode) return;
            thinkingIndicator = document.createElement('div');
            thinkingIndicator.classList.add('flex', 'mb-2', 'justify-start');
            const thinkingText = document.createElement('span');
            switch(type) {
                case 'web':
                    thinkingText.classList.add('web-search-indicator');
                    thinkingText.textContent = '🌐 Searching web...';
                    break;
                case 'image':
                    thinkingText.classList.add('image-search-indicator');
                    thinkingText.textContent = '🔮 Searching images...';
                    break;
                case 'video':
                    thinkingText.classList.add('video-search-indicator');
                    thinkingText.textContent = '📽 Searching videos...';
                    break;
                case 'editor':
                    thinkingText.classList.add('editor-call-indicator');
                    thinkingText.textContent = '🪄 Calling picture editor...';
                    break;
                case 'wiki':
                    thinkingText.classList.add('wiki-search-indicator');
                    thinkingText.textContent = '📖 Searching Wikipedia...';
                    break;
                case 'wolfram':
                    thinkingText.classList.add('wolfram-search-indicator');
                    thinkingText.textContent = '🔍 Doing Exa Search...';
                    break;
                case 'deep':
                    thinkingText.classList.add('deep-search-indicator');
                    thinkingText.textContent = '✨️ Performing Deep Search...';
                    break;
                case 'research':
                    thinkingText.classList.add('research-indicator');
                    thinkingText.textContent = '🐽 Researching...';
                    break;
                case 'reasoning':
                    thinkingText.classList.add('reasoning-indicator');
                    thinkingText.textContent = '💡 Reasoning...';
                    break;
                default:
                    thinkingText.classList.add('thinking-indicator');
                    thinkingText.textContent = 'Thinking...[]';
            }
            thinkingIndicator.appendChild(thinkingText);
            chatContainer.appendChild(thinkingIndicator);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            sendButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-10">
                    <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm6-2.438c0-.724.588-1.312 1.313-1.312h4.874c.725 0 1.313.588 1.313 1.313v4.874c0 .725-.588 1.313-1.313 1.313H9.564a1.312 1.312 0 0 1-1.313-1.313V9.564Z" clip-rule="evenodd" />
                </svg>`;
            sendButton.disabled = true;
        }

        function removeThinkingIndicator() {
            if (thinkingIndicator && thinkingIndicator.parentNode) {
                thinkingIndicator.parentNode.removeChild(thinkingIndicator);
                thinkingIndicator = null;
            }
            sendButton.innerHTML = sendButton.originalHTML;
            sendButton.className = sendButton.originalClasses;
            sendButton.disabled = false;
        }

        async function getVectorShiftResponse(prompt) {
            try {
                const bodyData = {
                    input: prompt,
                    chatbot_name: chatbotName,
                    username: username,
                    conversation_id: conversationId
                };
                showThinkingIndicator('thinking');
                const response = await fetch("https://api.vectorshift.ai/api/chatbots/run", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Api-Key": vectorShiftApiKey
                    },
                    body: JSON.stringify(bodyData)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`VectorShift API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
                }
                const data = await response.json();
                if (data.conversation_id) conversationId = data.conversation_id;
                if (data.output) {
                    removeThinkingIndicator();
                    addMessage(data.output, false);
                } else {
                    throw new Error("Unexpected response format from VectorShift API.");
                }
            } catch (error) {
                console.error("Error getting VectorShift response:", error);
                removeThinkingIndicator();
                addMessage(`Failed to get response: ${error.message}`, false);
            }
        }

        async function callSecondVectorShiftAPI(messageToSend) {
            try {
                const apiUrl = "https://api.vectorshift.ai/api/chatbots/run";
                const requestBody = {
                    input: messageToSend,
                    chatbot_name: "hjuo",
                    username: "upa_as45",
                    conversation_id: conversationId
                };
                showThinkingIndicator('web');
                const response = await fetch(apiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Api-Key": secondVectorShiftApiKey
                    },
                    body: JSON.stringify(requestBody)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Second VectorShift API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
                }
                const data = await response.json();
                if (data.output) {
                    removeThinkingIndicator();
                    addMessage(data.output, false);
                } else {
                    removeThinkingIndicator();
                    addMessage("Web search API call successful, but no output was received.", false);
                }
            } catch (error) {
                removeThinkingIndicator();
                console.error("Error calling second VectorShift API:", error);
                addMessage(`Error calling web search API: ${error.message}`, false);
            }
        }

        async function callThirdVectorShiftAPI(messageToSend) {
            try {
                const apiUrl = "https://api.vectorshift.ai/api/chatbots/run";
                const requestBody = {
                    input: messageToSend,
                    chatbot_name: "Samar AI",
                    username: "adari_146-7",
                    conversation_id: conversationId
                };
                showThinkingIndicator('reasoning');
                const response = await fetch(apiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Api-Key": thirdVectorShiftApiKey
                    },
                    body: JSON.stringify(requestBody)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Third VectorShift API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
                }
                const data = await response.json();
                if (data.output) {
                    removeThinkingIndicator();
                    addMessage(data.output, false);
                } else {
                    removeThinkingIndicator();
                    addMessage("Reasoning API call successful, but no output was received.", false);
                }
            } catch (error) {
                removeThinkingIndicator();
                console.error("Error calling third VectorShift API:", error);
                addMessage(`Error calling reasoning API: ${error.message}`, false);
            }
        }

        async function callFourthVectorShiftAPI(messageToSend) {
            try {
                const apiUrl = "https://api.vectorshift.ai/api/chatbots/run";
                const requestBody = {
                    input: messageToSend,
                    chatbot_name: "zayandouble",
                    username: "ari_67ds",
                    conversation_id: conversationId
                };
                showThinkingIndicator('research');
                const response = await fetch(apiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Api-Key": fourthVectorShiftApiKey
                    },
                    body: JSON.stringify(requestBody)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Fourth VectorShift API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
                }
                const data = await response.json();
                if (data.output) {
                    removeThinkingIndicator();
                    addMessage(data.output, false);
                } else {
                    removeThinkingIndicator();
                    addMessage("Research API call successful, but no output was received.", false);
                }
            } catch (error) {
                removeThinkingIndicator();
                console.error("Error calling fourth VectorShift API:", error);
                addMessage(`Error calling research API: ${error.message}`, false);
            }
        }

        async function callFifthVectorShiftAPI(messageToSend) {
            try {
                const apiUrl = "https://api.vectorshift.ai/api/chatbots/run";
                const requestBody = {
                    input: messageToSend,
                    chatbot_name: "wiki_bot",
                    username: "wiki_user_101",
                    conversation_id: conversationId
                };
                showThinkingIndicator('wiki');
                const response = await fetch(apiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Api-Key": fifthVectorShiftApiKey
                    },
                    body: JSON.stringify(requestBody)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Fifth VectorShift API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
                }
                const data = await response.json();
                if (data.output) {
                    removeThinkingIndicator();
                    addMessage(data.output, false);
                } else {
                    removeThinkingIndicator();
                    addMessage("Wikipedia API call successful, but no output was received.", false);
                }
            } catch (error) {
                removeThinkingIndicator();
                console.error("Error calling fifth VectorShift API:", error);
                addMessage(`Error calling Wikipedia API: ${error.message}`, false);
            }
        }

        async function callSixthVectorShiftAPI(messageToSend) {
            try {
                const apiUrl = "https://api.vectorshift.ai/api/chatbots/run";
                const requestBody = {
                    input: messageToSend,
                    chatbot_name: "wolfram_bot",
                    username: "wolfram_user_112",
                    conversation_id: conversationId
                };
                showThinkingIndicator('wolfram');
                const response = await fetch(apiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Api-Key": sixthVectorShiftApiKey
                    },
                    body: JSON.stringify(requestBody)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Sixth VectorShift API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
                }
                const data = await response.json();
                if (data.output) {
                    removeThinkingIndicator();
                    addMessage(data.output, false);
                } else {
                    removeThinkingIndicator();
                    addMessage("Wolfram Alpha API call successful, but no output was received.", false);
                }
            } catch (error) {
                removeThinkingIndicator();
                console.error("Error calling sixth VectorShift API:", error);
                addMessage(`Error calling Wolfram Alpha API: ${error.message}`, false);
            }
        }

        async function callSeventhVectorShiftAPI(messageToSend) {
            try {
                const apiUrl = "https://api.vectorshift.ai/api/chatbots/run";
                const requestBody = {
                    input: messageToSend,
                    chatbot_name: "deep_search_bot",
                    username: "deep_user_131",
                    conversation_id: conversationId
                };
                showThinkingIndicator('deep');
                const response = await fetch(apiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Api-Key": seventhVectorShiftApiKey
                    },
                    body: JSON.stringify(requestBody)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Seventh VectorShift API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
                }
                const data = await response.json();
                if (data.output) {
                    removeThinkingIndicator();
                    addMessage(data.output, false);
                } else {
                    removeThinkingIndicator();
                    addMessage("Deep Search API call successful, but no output was received.", false);
                }
            } catch (error) {
                removeThinkingIndicator();
                console.error("Error calling seventh VectorShift API:", error);
                addMessage(`Error calling deep search API: ${error.message}`, false);
            }
        }

        async function searchPexelsImages(query) {
            try {
                showThinkingIndicator('image');
                let imageUrl = null;
                let imageAlt = null;
                while (!imageUrl && currentPexelsImagePage <= MAX_PEXELS_PAGES) {
                    const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${imagesPerPage}&page=${currentPexelsImagePage}`, {
                        method: "GET",
                        headers: { Authorization: pexelsApiKey }
                    });
                    if (!response.ok) throw new Error(`Pexels API error! Status: ${response.status}, Message: ${await response.text()}`);
                    const data = await response.json();
                    if (data.photos.length === 0) {
                        if (currentPexelsImagePage === 1) {
                            removeThinkingIndicator();
                            addMessage(`No images found for "${query}". Try again.`, false);
                            return;
                        }
                        currentPexelsImagePage = 1;
                        break;
                    }
                    for (const photo of data.photos) {
                        if (!usedImageIds.has(photo.id)) {
                            imageUrl = photo.src.large;
                            imageAlt = photo.alt || "Image from Pexels";
                            usedImageIds.add(photo.id);
                            break;
                        }
                    }
                    if (!imageUrl) currentPexelsImagePage++;
                    if (data.next_page === undefined && !imageUrl) {
                        removeThinkingIndicator();
                        addMessage(`No new images found for "${query}" within ${MAX_PEXELS_PAGES} pages.`, false);
                        return;
                    }
                }
                if (imageUrl) {
                    removeThinkingIndicator();
                    const messageDiv = document.createElement('div');
                    messageDiv.classList.add('flex', 'mb-2', 'justify-start');
                    const imageContainer = document.createElement('div');
                    imageContainer.classList.add('ai-response', 'ai-image-container');
                    const imgElement = document.createElement('img');
                    imgElement.src = imageUrl;
                    imgElement.alt = imageAlt;
                    imgElement.classList.add('generated-image');
                    imgElement.onerror = function() {
                        addMessage(`Error loading image for "${query}".`, false);
                    };
                    imageContainer.appendChild(imgElement);
                    const description = document.createElement('div');
                    description.classList.add('ai-image-description');
                    description.textContent = `Here's an image for "${query}":`;
                    imageContainer.appendChild(description);
                    messageDiv.appendChild(imageContainer);
                    chatContainer.appendChild(messageDiv);
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            } catch (error) {
                console.error("Error searching Pexels images:", error);
                removeThinkingIndicator();
                addMessage(`Failed to search for images: ${error.message}.`, false);
            }
        }

        async function searchPexelsVideos(query) {
            try {
                showThinkingIndicator('video');
                let videoUrl = null;
                let videoAlt = null;
                while (!videoUrl && currentPexelsVideoPage <= MAX_PEXELS_PAGES) {
                    const response = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${videosPerPage}&page=${currentPexelsVideoPage}`, {
                        method: "GET",
                        headers: { Authorization: pexelsApiKey }
                    });
                    if (!response.ok) throw new Error(`Pexels API error! Status: ${response.status}, Message: ${await response.text()}`);
                    const data = await response.json();
                    if (data.videos.length === 0) {
                        if (currentPexelsVideoPage === 1) {
                            removeThinkingIndicator();
                            addMessage(`No videos found for "${query}". Try again.`, false);
                            return;
                        }
                        currentPexelsVideoPage = 1;
                        break;
                    }
                    for (const video of data.videos) {
                        if (!usedVideoIds.has(video.id)) {
                            const videoFile = video.video_files.find(function(file) {
                                return file.file_type === "video/mp4" && file.quality === "hd";
                            }) || video.video_files.find(function(file) {
                                return file.file_type === "video/mp4";
                            });
                            if (videoFile) {
                                videoUrl = videoFile.link;
                                videoAlt = video.url || "Video from Pexels";
                                usedVideoIds.add(video.id);
                                break;
                            }
                        }
                    }
                    if (!videoUrl) currentPexelsVideoPage++;
                    if (data.next_page === undefined && !videoUrl) {
                        removeThinkingIndicator();
                        addMessage(`No new videos found for "${query}" within ${MAX_PEXELS_PAGES} pages.`, false);
                        return;
                    }
                }
                if (videoUrl) {
                    removeThinkingIndicator();
                    const messageDiv = document.createElement('div');
                    messageDiv.classList.add('flex', 'mb-2', 'justify-start');
                    const videoContainer = document.createElement('div');
                    videoContainer.classList.add('ai-response', 'ai-video-container');
                    const videoElement = document.createElement('video');
                    videoElement.src = videoUrl;
                    videoElement.alt = videoAlt;
                    videoElement.controls = true;
                    videoElement.classList.add('generated-video');
                    videoElement.onerror = function() {
                        addMessage(`Error loading video for "${query}".`, false);
                    };
                    videoContainer.appendChild(videoElement);
                    const description = document.createElement('div');
                    description.classList.add('ai-video-description');
                    description.textContent = `Here's a video for "${query}":`;
                    videoContainer.appendChild(description);
                    messageDiv.appendChild(videoContainer);
                    chatContainer.appendChild(messageDiv);
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            } catch (error) {
                console.error("Error searching Pexels videos:", error);
                removeThinkingIndicator();
                addMessage(`Failed to search for videos: ${error.message}.`, false);
            }
        }

        async function generatePexelsVideo(query) {
            let generatingMessage;
            try {
                isGeneratingVideo = true;
                generatingMessage = showVideoGeneratingIndicator();
                let videoUrl = null;
                let videoAlt = null;
                let page = 20;
                while (!videoUrl && page <= MAX_PEXELS_PAGES) {
                    const response = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${videosPerPage}&page=${page}`, {
                        method: "GET",
                        headers: { Authorization: pexelsApiKey }
                    });
                    if (!response.ok) throw new Error(`Pexels API error! Status: ${response.status}`);
                    const data = await response.json();
                    if (data.videos.length === 0) {
                        page++;
                        continue;
                    }
                    for (const video of data.videos) {
                        if (!usedVideoIds.has(video.id)) {
                            const videoFile = video.video_files.find(function(file) {
                                return file.file_type === "video/mp4" && file.quality === "hd";
                            }) || video.video_files.find(function(file) {
                                return file.file_type === "video/mp4";
                            });
                            if (videoFile) {
                                videoUrl = videoFile.link;
                                videoAlt = video.url || "Generated Video from Pexels";
                                usedVideoIds.add(video.id);
                                break;
                            }
                        }
                    }
                    page++;
                }
                await new Promise(function(resolve) {
                    setTimeout(resolve, 7000);
                });
                isGeneratingVideo = false;
                if (generatingMessage) generatingMessage.remove();
                if (videoUrl) {
                    const messageDiv = document.createElement('div');
                    messageDiv.classList.add('flex', 'mb-2', 'justify-start');
                    const videoContainer = document.createElement('div');
                    videoContainer.classList.add('ai-response', 'ai-video-container');
                    const videoElement = document.createElement('video');
                    videoElement.src = videoUrl;
                    videoElement.alt = videoAlt;
                    videoElement.controls = true;
                    videoElement.classList.add('generated-video');
                    videoContainer.appendChild(videoElement);
                    const description = document.createElement('div');
                    description.classList.add('ai-video-description');
                    description.textContent = `Generated video for "${query}":`;
                    videoContainer.appendChild(description);
                    messageDiv.appendChild(videoContainer);
                    chatContainer.appendChild(messageDiv);
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                } else {
                    addMessage(`No videos found for "${query}" within ${MAX_PEXELS_PAGES} pages.`, false);
                }
            } catch (error) {
                console.error("Error generating video:", error);
                isGeneratingVideo = false;
                if (generatingMessage) generatingMessage.remove();
                addMessage(`Failed to generate video: ${error.message}`, false);
            }
        }

        function showVideoGeneratingIndicator() {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('flex', 'mb-2', 'justify-start');
            const container = document.createElement('div');
            container.classList.add('video-generating-container');
            container.innerHTML = `
                <div class="spinner"></div>
                <span class="video-generating-text">ArX is Generating video....</span>
            `;
            messageDiv.appendChild(container);
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            return messageDiv;
        }

        function showImageEditor(mediaSrc) {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('flex', 'mb-2', 'justify-start');
            const editorCallIndicator = document.createElement('span');
            editorCallIndicator.classList.add('editor-call-indicator');
            editorCallIndicator.textContent = 'Calling image editor...';
            messageDiv.appendChild(editorCallIndicator);
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;

            setTimeout(function() {
                messageDiv.remove();
                const editorDiv = document.createElement('div');
                editorDiv.classList.add('flex', 'mb-2', 'justify-start');
                const editorContainer = document.createElement('div');
                editorContainer.classList.add('editor-container', 'ai-response');
                editorContainer.innerHTML = `
                    <div class="editor-header">
                        <i class="bi bi-image"></i>
                        <h2 class="text-lg font-semibold">Image Editor</h2>
                    </div>
                    <img src="${mediaSrc}" alt="Image to Edit" style="max-width: 100%; max-height: 400px;">
                    <div class="flex flex-col gap-2 mt-2 editor-controls">
                        <label for="brightness">Brightness:</label>
                        <input type="range" id="brightness" min="0" max="200" value="100" class="w-full">
                        <label for="contrast">Contrast:</label>
                        <input type="range" id="contrast" min="0" max="200" value="100" class="w-full">
                        <label for="saturation">Saturation:</label>
                        <input type="range" id="saturation" min="0" max="200" value="100" class="w-full">
                        <button class="apply-enhancements bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">Apply</button>
                        <button class="close-editor bg-gray-300 text-black px-4 py-2 rounded-md hover:bg-gray-400">Close</button>
                    </div>
                `;
                editorDiv.appendChild(editorContainer);
                chatContainer.appendChild(editorDiv);
                chatContainer.scrollTop = chatContainer.scrollHeight;

                const imgElement = editorContainer.querySelector('img');
                const brightness = editorContainer.querySelector('#brightness');
                const contrast = editorContainer.querySelector('#contrast');
                const saturation = editorContainer.querySelector('#saturation');
                const applyButton = editorContainer.querySelector('.apply-enhancements');
                const closeButton = editorContainer.querySelector('.close-editor');
                const currentImage = new Image();
                currentImage.src = mediaSrc;

                function applyImageFilters() {
                    if (!currentImage.complete || currentImage.naturalWidth === 0) {
                        console.error("Image not loaded or invalid.");
                        return;
                    }
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = currentImage.naturalWidth;
                    canvas.height = currentImage.naturalHeight;
                    ctx.filter = `brightness(${brightness.value}%) contrast(${contrast.value}%) saturate(${saturation.value}%)`;
                    ctx.drawImage(currentImage, 0, 0);
                    imgElement.src = canvas.toDataURL('image/jpeg');
                }

                currentImage.onerror = function() {
                    addMessage("Failed to load image for editing.", false);
                    editorDiv.remove();
                };

                brightness.addEventListener('input', applyImageFilters);
                contrast.addEventListener('input', applyImageFilters);
                saturation.addEventListener('input', applyImageFilters);
                applyButton.addEventListener('click', function() {
                    uploadedImageBase64 = imgElement.src;
                    imageQuestionCount = 0;
                    addMessage("Here's your edited image:", false, uploadedImageBase64);
                    editorDiv.remove();
                });
                closeButton.addEventListener('click', function() {
                    editorDiv.remove();
                    uploadedImageBase64 = null;
                    imageQuestionCount = 0;
                });
            }, 1000);
        }

        function isImageRelated(message) {
            const lowerCaseMessage = message.toLowerCase();
            const imageKeywords = ["image", "picture", "photo", "what is this", "describe", "edit", "color", "object", "scene"];
            return imageKeywords.some(function(keyword) {
                return lowerCaseMessage.includes(keyword);
            }) || lowerCaseMessage.includes("this");
        }

        sendButton.addEventListener('click', async function() {
            const userMessage = userInput.value;
            userInput.value = '';
            const trimmedMessage = userMessage.trim();
            if (trimmedMessage !== '') {
                addMessage(trimmedMessage, true);
                const lowerCaseMessage = trimmedMessage.toLowerCase();
                try {
                    if (useReasoningApi) {
                        await callThirdVectorShiftAPI(trimmedMessage);
                    } else if (lowerCaseMessage === 'edit this image') {
                        if (uploadedImageBase64) {
                            showThinkingIndicator('editor');
                            showImageEditor(uploadedImageBase64);
                            removeThinkingIndicator();
                        } else {
                            addMessage("Please upload an image first to edit.", false);
                        }
                    } else if (lowerCaseMessage.startsWith('search image of ')) {
                        const imagePrompt = trimmedMessage.substring("search image of ".length).trim();
                        if (imagePrompt) await searchPexelsImages(imagePrompt);
                    } else if (lowerCaseMessage.startsWith('search video of ')) {
                        const videoPrompt = trimmedMessage.substring("search video of ".length).trim();
                        if (videoPrompt) await searchPexelsVideos(videoPrompt);
                    } else if (lowerCaseMessage.startsWith('generate video of ')) {
                        const videoPrompt = trimmedMessage.substring("generate video of ".length).trim();
                        if (videoPrompt) await generatePexelsVideo(videoPrompt);
                    } else if (lowerCaseMessage.startsWith('generate image of ')) {
                        showThinkingIndicator('image');
                        const imagePrompt = trimmedMessage.substring("generate image of ".length).trim();
                        addMessage(`Generating an image for "${imagePrompt}"...`, false, null, "https://app.vectorshift.ai/forms/embedded/67d941ab7e6f30aec4f025a7");
                        removeThinkingIndicator();
                    } else if (uploadedImageBase64 && lowerCaseMessage.includes("edit this image")) {
                        showThinkingIndicator('editor');
                        showImageEditor(uploadedImageBase64);
                        removeThinkingIndicator();
                    } else if (uploadedImageBase64 && imageQuestionCount < maxImageQuestions && isImageRelated(trimmedMessage)) {
                        const geminiResponse = await askGeminiAboutImage(uploadedImageBase64, trimmedMessage);
                        if (geminiResponse) addMessage(geminiResponse, false);
                        imageQuestionCount++;
                        if (imageQuestionCount >= maxImageQuestions) {
                            uploadedImageBase64 = null;
                            fileInput.value = '';
                            addMessage("Image-related question limit reached. Switching to regular chat mode.", false);
                        }
                    } else if (uploadedImageBase64 && !isImageRelated(trimmedMessage)) {
                        uploadedImageBase64 = null;
                        fileInput.value = '';
                        imageQuestionCount = 0;
                        await getVectorShiftResponse(trimmedMessage);
                    } else if (useSecondApi && selectedSearchMode) {
                        switch (selectedSearchMode) {
                            case 'web': await callSecondVectorShiftAPI(trimmedMessage); break;
                            case 'deep': await callSeventhVectorShiftAPI(trimmedMessage); break;
                            case 'wiki': await callFifthVectorShiftAPI(trimmedMessage); break;
                            case 'wolfram': await callSixthVectorShiftAPI(trimmedMessage); break;
                            case 'research': await callFourthVectorShiftAPI(trimmedMessage); break;
                        }
                    } else {
                        await getVectorShiftResponse(trimmedMessage);
                    }
                } catch (error) {
                    removeThinkingIndicator();
                    console.error("An error occurred:", error);
                    addMessage(`An error occurred: ${error.message}`, false);
                }
            }
            hideSuggestions();
        });

        userInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                sendButton.click();
            }
        });

        userInput.addEventListener('paste', function() {
            hideSuggestions();
        });

        userInput.addEventListener('keyup', function() {
            if (userInput.value.trim() !== '') hideSuggestions();
        });

        newChatButton.addEventListener('click', function() {
            chatContainer.innerHTML = '';
            conversationId = null;
            errorDiv.classList.add('hidden');
            errorDiv.textContent = '';
            generatedImagesContainer.innerHTML = '';
            removeThinkingIndicator();
            usedVideoIds.clear();
            usedImageIds.clear();
            currentPexelsVideoPage = 1;
            currentPexelsImagePage = 1;
            chatbotName = "Samar ai";
            username = "da_564";
            useSecondApi = false;
            useReasoningApi = false;
            selectedSearchMode = null;
            if (hButton) {
                hButton.classList.remove('active');
                hButton.innerHTML = '<i class="bi bi-globe"></i>';
            }
            reasoningButton.classList.remove('active');
            uploadedImageBase64 = null;
            fileInput.value = '';
            imageQuestionCount = 0;
            isGeneratingVideo = false;
            sendButton.innerHTML = sendButton.originalHTML;
            sendButton.className = sendButton.originalClasses;
            sendButton.disabled = false;
            loadSuggestions();
            searchPopup.style.display = 'none';
        });

        voiceButton.addEventListener('click', function() {
            window.open("https://www.w3.org", "_blank");
        });

        if (hButton) {
            hButton.addEventListener('click', function() {
                if (!useSecondApi) {
                    searchPopup.style.display = searchPopup.style.display === 'block' ? 'none' : 'block';
                } else {
                    useSecondApi = false;
                    selectedSearchMode = null;
                    hButton.classList.remove('active');
                    hButton.innerHTML = '<i class="bi bi-globe"></i>';
                    searchPopup.style.display = 'none';
                }
            });
        }

        reasoningButton.addEventListener('click', function() {
            useReasoningApi = !useReasoningApi;
            if (useReasoningApi) {
                reasoningButton.classList.add('active');
                useSecondApi = false;
                selectedSearchMode = null;
                if (hButton) {
                    hButton.classList.remove('active');
                    hButton.innerHTML = '<i class="bi bi-globe"></i>';
                }
                searchPopup.style.display = 'none';
            } else {
                reasoningButton.classList.remove('active');
            }
        });

        document.getElementById('web-search').addEventListener('click', function() {
            useSecondApi = true;
            selectedSearchMode = 'web';
            hButton.classList.add('active');
            hButton.innerHTML = '<i class="bi bi-globe"></i> ';
            searchPopup.style.display = 'none';
        });

        document.getElementById('deep-search').addEventListener('click', function() {
            useSecondApi = true;
            selectedSearchMode = 'deep';
            hButton.classList.add('active');
            hButton.innerHTML = '<i class="bi bi-search"></i> ';
            searchPopup.style.display = 'none';
        });

        document.getElementById('wiki-search').addEventListener('click', function() {
            useSecondApi = true;
            selectedSearchMode = 'wiki';
            hButton.classList.add('active');
            hButton.innerHTML = '<i class="bi bi-book"></i> ';
            searchPopup.style.display = 'none';
        });

        document.getElementById('wolfram-search').addEventListener('click', function() {
            useSecondApi = true;
            selectedSearchMode = 'wolfram';
            hButton.classList.add('active');
            hButton.innerHTML = '<i class="bi bi-cpu"></i> ';
            searchPopup.style.display = 'none';
        });

        document.getElementById('research').addEventListener('click', function() {
            useSecondApi = true;
            selectedSearchMode = 'research';
            hButton.classList.add('active');
            hButton.innerHTML = '<i class="bi bi-journal-text"></i> ';
            searchPopup.style.display = 'none';
        });

        document.addEventListener('click', function(event) {
            if (!hButton.contains(event.target) && !searchPopup.contains(event.target)) {
                searchPopup.style.display = 'none';
            }
        });

        window.addEventListener('load', function() {
            loadSuggestions();
            userInput.focus();
        });

        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'imageGenerated') {
                const imageUrl = event.data.url;
                const messageDiv = document.createElement('div');
                messageDiv.classList.add('flex', 'mb-2', 'justify-start');
                const imageContainer = document.createElement('div');
                imageContainer.classList.add('ai-response', 'ai-image-container');
                const imgElement = document.createElement('img');
                imgElement.src = imageUrl;
                imgElement.alt = "Generated Image";
                imgElement.classList.add('generated-image');
                imageContainer.appendChild(imgElement);
                const description = document.createElement('div');
                description.classList.add('ai-image-description');
                description.textContent = `Generated image: `;
                imageContainer.appendChild(description);
                messageDiv.appendChild(imageContainer);
                chatContainer.appendChild(messageDiv);
                chatContainer.scrollTop = chatContainer.scrollHeight;

                const iframes = chatContainer.getElementsByTagName('iframe');
                for (let iframe of iframes) {
                    iframe.remove();
                }
            }
        });
