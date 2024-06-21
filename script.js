const MAIN_VACANCIES_BLOK_NAME = "a11y-main-content"
const START_VACANSY_NUM = 0
const ignoreClassesBlockWork = ['bloko-modal-overlay']

let vacancyCollectionHtml = document.getElementById(MAIN_VACANCIES_BLOK_NAME)?.children
let isEnabledExtensions = false
let completedVacancyIndex = 0
let coverLetter
let quantityVacancies = 0
let quantityCompletedVacancies = 0
let final = false
let errorAlready = false
let vacancyResponseButtonMain = document.querySelector(`[data-qa="vacancy-response-link-top"]`)



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
        coverLetter = message.coverLetter
        quantityVacancies = message.vacanciesNumber

        onExtension()
    }

    if (message.type === 'stopFunction') {
        offExtension()
    }
})



function tryAgainWrapper(fn) {
    let errorAlready = 0
    let savedError
    let arrNotApprovedVacancies = []

    async function wrapper(...args) {
        try {
            if (errorAlready < 10) await fn.apply(this, args)
            else throw savedError
            
            if (errorAlready > 1) errorAlready = 0
        } catch (err) {
            const vacancyErrorNode = findNodeByTagnameAndAttribute(args[0], 'H2', 'data-qa' ,'bloko-header-2')
            const vacancyText = vacancyErrorNode?.innerText
            const vacancyLink = findNodeByTagnameAndAttribute(vacancyErrorNode, 'A', 'class' ,'bloko-link')?.href
            const vacancyErrorElement = { vacancyLabel: vacancyText, vacancyLink: vacancyLink }
            await chrome.storage.local.get({errorVacancies: []}, (res) => {
                if (!res.errorVacancies.find(vacancy => vacancy.vacancyLabel === vacancyErrorElement.vacancyLabel)) {
                    arrNotApprovedVacancies.push(vacancyErrorElement)
                    chrome.storage.local.set({errorVacancies: [vacancyErrorElement, ...res.errorVacancies]})

                    chrome.runtime.sendMessage({type: 'redrawErrorVacansiesList', content: [vacancyErrorElement, ...res.errorVacancies]})
                }
            })   

            savedError = err
            ++errorAlready 
            if (errorAlready >= 10) throw err
        }    
    }

    return wrapper
}

async function перебратьВсеВакансии() {
    if (final) toFinish()

    completedVacancyIndex = START_VACANSY_NUM

    vacancyCollectionHtml = document.getElementById("a11y-main-content").children

    for (let i = 0; completedVacancyIndex <= vacancyCollectionHtml.length; completedVacancyIndex++) {
        try {
            if (quantityVacancies === quantityCompletedVacancies) toFinish()

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

            quantityCompletedVacancies++

            chrome.runtime.sendMessage({type: 'quantityVacancies', content: quantityVacancies - quantityCompletedVacancies})
        } catch (err) {
            console.error(err.cause || err)

            offExtension(err.cause || err)

            userScrollOn()

            break
        }
    }

    return true
}

function откликнутьсяНаВакансию(vacancyNode, КнопкаОткликнуться, delay = 1000) {
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

            await pause(500)

            resolve()
        } catch(err) {
            reject(err)
        }
    })
}

откликнутьсяНаВакансию = tryAgainWrapper(откликнутьсяНаВакансию)

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

function findNodeByTagnameAndAttribute(node, tagName, attribute, attributeValue) {
    // Проверяем текущий узел
    if (node && node.tagName === tagName && node.attributes[attribute].nodeName ===  attribute && node.attributes[attribute].nodeValue === attributeValue) {
        return node; // Если имя узла соответствует целевому, возвращаем его
    }

    if (!node.children) return undefined

    // Перебираем всех дочерних узлов рекурсивно
    for (let i = 0; i < node.children.length; i++) {
        const result = findNodeByTagnameAndAttribute(node.children[i], tagName, attribute, attributeValue);
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

window.addEventListener('popstate', function(event) {
    console.log('popstate', event.state, event.state.content)
});

const observeChanges = (element) => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                console.log('Style changed:', mutation.target.style.display);
            }
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    let doDeleteElement = false
                    ignoreClassesBlockWork.forEach(item => {
                        doDeleteElement = node.classList.contains(item)
                    })
                    if (node.nodeType === 1 && doDeleteElement) { // Проверка, что добавлен элемент
                        node.parentNode.removeChild(node)
                    }
                });
            }
        });
    });

    observer.observe(element, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ['style']
    });
};

observeChanges(document.body)

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
    userScrollOff()

    isEnabledExtensions = true

    перебратьВсеВакансии()
}

function offExtension(err) {
    if (err) chrome.runtime.sendMessage({type: 'error', content: err.message})

    isEnabledExtensions = false

    userScrollOn()
}

function toFinish() {
    offExtension()

    chrome.runtime.sendMessage({type: 'final', content: true})

    alert('Перебор вакансий завершен!')
}