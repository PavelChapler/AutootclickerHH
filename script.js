const MAIN_VACANCIES_BLOK_NAME = "a11y-main-content"
const START_VACANSY_NUM = 0

let vacancyCollectionHtml = document.getElementById(MAIN_VACANCIES_BLOK_NAME).children
let isEnabledExtensions = false
let completedVacancyIndex = 0
let coverLetter
let final = false


const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            // Указываем, что элемент стал видимым
            entry.target._isVisible = true
            // Вызываем resolve, сохраненный в элементе
            if (entry.target._observerResolve) {
                entry.target._observerResolve();
                delete entry.target._observerResolve; // Удаляем обработчик после его использования
            }
            observer.unobserve(entry.target); // Отключаем наблюдение за текущим элементом
        }
    })
})


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "executeFunction") {
        onExtension()
        coverLetter = message.coverLetter

        userScrollOff()
        перебратьВсеВакансии()
    }

    if (message.type === 'stopFunction') {
        offExtension()
        userScrollOn()
    }
})


async function перебратьВсеВакансии() {
    if (final) toFinish()

    completedVacancyIndex = START_VACANSY_NUM

    vacancyCollectionHtml = document.getElementById("a11y-main-content").children

    for (let i = 0; completedVacancyIndex <= vacancyCollectionHtml.length; completedVacancyIndex++) {
        try {
            if (!isEnabledExtensions) break;

            if (completedVacancyIndex === vacancyCollectionHtml.length) {
                goNextPage()
                break
            }

            const vacancyNode = vacancyCollectionHtml[completedVacancyIndex];
            const узелКнопкиОткликнуться = findNodeByTagnameAndTextInTag(vacancyNode, 'SPAN', 'Откликнуться')?.parentNode;

            if (!узелКнопкиОткликнуться) continue;

            await scrollToTheElement(vacancyNode);
            await waitForElementToBecomeVisible(vacancyNode);

            await откликнутьсяНаВакансию(vacancyNode, узелКнопкиОткликнуться, 2000)
        } catch (err) {
            console.error(err.cause || err)

            offExtension(err.message)

            userScrollOn()

            break
        }
    }

    return true
}

function откликнутьсяНаВакансию(vacancyNode, КнопкаОткликнуться, delay = 0) {
    return new Promise(async (resolve, reject) => {
        try {
            setTimeout(() => {
                history.replaceState({}, document.title, window.location.pathname);
            }, 0);
    
            КнопкаОткликнуться.addEventListener('click', function(event) {
                event.preventDefault()
            });
    
            КнопкаОткликнуться.click()
    
            await pause(delay)
    
            if (checkBlockingPopup()) {
                await respondInBlockedPopup()
                
                return
            }
    
            await clickAttachCoverLetter(vacancyNode, 'vacancy-response-letter-toggle')
    
            await pause(delay)
    
            await writeCoverLetter(vacancyNode, coverLetter, 'textarea[name="text"]')
    
            await pause(delay)
    
            await sendCoverLetter(vacancyNode, 'vacancy-response-letter-submit')

            resolve()
        } catch(err) {
            reject(err)
        }
    })
}

function findNodeByTagnameAndTextInTag(node, tagName, textInTag) {
    // Проверяем текущий узел
    if (node && node.tagName === tagName && node.innerText === textInTag) {
        return node; // Если имя узла соответствует целевому, возвращаем его
    }

    // Перебираем всех дочерних узлов рекурсивно
    for (let i = 0; i < node.children.length; i++) {
        const result = findNodeByTagnameAndTextInTag(node.children[i], tagName, textInTag);
        if (result) {
            return result; // Если имя найдено в одном из дочерних узлов, возвращаем его
        }
    }

    // Если имя не найдено в текущем узле и его дочерних узлах, возвращаем undefined
    return undefined;
}

function scrollToTheElement(element) {
    if (element) {
        element.scrollIntoView({
            behavior: "smooth",
            block: "start"
        })
    }
}

function waitForElementToBecomeVisible(element) {
    return new Promise(resolve => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Элемент теперь виден
                    observer.unobserve(entry.target); // Прекращаем наблюдение
                   setTimeout(() => resolve(), 1000); // Разрешаем промис
                }
            });
        }, { threshold: 1.0 }); // Значение порога, определяющее, какая часть элемента должна быть видна, чтобы считаться пересекающейся

        observer.observe(element);
    });
}

async function clickAttachCoverLetter(parentNode, attributeNameButton) {
    const button = await getButtonSendCoverLetter(parentNode, attributeNameButton)

    return new Promise((resolve, reject) => {
        if (button) {
            button.click()
            resolve()
        } else {
            reject(new Error('Кнопка "Прикрепить сопроводительное не найдена"'))
        }
    })
}

function getButtonSendCoverLetter(parentNode, attributeName) {
    return new Promise((resolve, reject) => {
        const button = parentNode.querySelector(`[data-qa="${attributeName}"]`)

        if (!button) reject(new Error('Кнопка для Отправки сопроводительного не найдена'))
        else resolve(button)
    })
}

function getTextAreaForCoverLetter(parentNode, attributeName) {
    return parentNode.querySelector(attributeName)
}

async function writeCoverLetter(vacancyNode, text, attributeName) {
    const field = await getTextAreaForCoverLetter(vacancyNode, attributeName)
    return new Promise((resolve, reject) => {
        if (field) {
            field.value = text
            resolve()
        } else {
            reject(new Error('Не найдено поле куда вводить сопроводительное'))
        }
    })
}

function getButtonSendCoverLetter(parentNode, attributeName) {
    return new Promise((resolve, reject) => {
        const button = parentNode.querySelector(`[data-qa="${attributeName}"]`)

        if (!button) reject(new Error('Кнопка для Отправки сопроводительного не найдена'))
        else resolve(button)
    })
}

async function sendCoverLetter(vacancyNode, attributeName) {
    const buttonSend = await getButtonSendCoverLetter(vacancyNode, attributeName)

    return new Promise((resolve, reject) => {
        if (buttonSend) {
            buttonSend.click()
            resolve()
        } else {
            reject(new Error('Нету кнопки для отправки сопроводительного'))
        }
    })
}

function goNextPage() {
    const pagerButtonNext = document.querySelector(`[data-qa="${'pager-next'}"]`)

    if (!pagerButtonNext) {
        final = true

        return
    }

    pagerButtonNext.click()

    setTimeout(() => перебратьВсеВакансии(), 10000)
}

function checkBlockingPopup() {
    return !!document.querySelector(`[data-qa="${'bloko-modal'}"]`)
}

function respondInBlockedPopup() {
    return new Promise((resolve, reject) => {
        try {
            const inputCoverLetterBlockingPopupField = document.querySelector(`[data-qa="${'vacancy-response-popup-form-letter-input'}"]`)
            const buttonAttachBlockingPopup = document.querySelector(`[data-qa="${'vacancy-response-submit-popup'}"]`)

            if (inputCoverLetterBlockingPopupField && buttonAttachBlockingPopup) {
                inputCoverLetterBlockingPopupField.value = coverLetter

                const inputEvent = new Event('input', { bubbles: true })

                inputCoverLetterBlockingPopupField.dispatchEvent(inputEvent)

                setTimeout(() => {
                    buttonAttachBlockingPopup.click()

                    resolve()
                }, 2000)

                setTimeout(() => {
                    if (checkBlockingPopup) reject(new Error('Какая-то непонятная ошибка в блокирующем попапе'))
                }, 2000)

        } else {
            reject(new Error('Найден блокирующий попап но текстовое поле или кнопка в нем не найдены'))
        }
        } catch (err) {
            throw new Error(err)
        }
    })
}

function pause(delay) {
    return new Promise(resolve => setTimeout(() => resolve(), delay))
  }
  
function preventScroll(event) {
    event.preventDefault()
}

function userScrollOff() {
    window.addEventListener('wheel', preventScroll, {passive: false})
    window.addEventListener('touchmove', preventScroll, {passive: false})
}

function userScrollOn() {
    window.removeEventListener('wheel', preventScroll)
    window.removeEventListener('touchmove', preventScroll)
}

function onExtension() {
    isEnabledExtensions = true
}

function offExtension(err) {
    if (err) chrome.runtime.sendMessage({type: 'error', content: err.message})

    isEnabledExtensions = false
}

function toFinish() {
    offExtension()

    chrome.runtime.sendMessage({type: 'final', content: true})

    alert('Перебор вакансий завершен!')
}