let vacancyCollectionHtml = document.getElementById("a11y-main-content").children
let isEnabledExtensions = false
let completedVacancyIndex = 0
let coverLetter
console.log('yes')
console.dir(vacancyCollectionHtml)

// window.addEventListener('popstate', function(event) {
//     event.preventDefault(); // Предотвращаем изменение URL
//     history.pushState({}, '', window.location.href); // Восстанавливаем URL
// });

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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "executeFunction") {
        isEnabledExtensions = true
        coverLetter = message.coverLetter

        userScrollOff()
        saveCurrentUrl()
        перебратьВсеВакансии()
    }

    if (message.type === 'stopFunction') {
        isEnabledExtensions = false
        userScrollOn()
    }
})

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

async function перебратьВсеВакансии() {
    vacancyCollectionHtml = document.getElementById("a11y-main-content").children

    console.dir(vacancyCollectionHtml)

    console.log("Перебор вакансий запущен")

    for (let i = 0; completedVacancyIndex <= vacancyCollectionHtml.length; completedVacancyIndex++) {
        try {
            if (!isEnabledExtensions) break;

            console.log('vacancyIndex', completedVacancyIndex, 'vacancyLength', vacancyCollectionHtml.length)
            if (completedVacancyIndex === vacancyCollectionHtml.length) {
                goNextPage()
                break
            }

            const vacancyNode = vacancyCollectionHtml[completedVacancyIndex];
            const узелСсылки = findNodeByTagnameAndTextInTag(vacancyNode, 'SPAN', 'Откликнуться')?.parentNode;

            console.log('узелссылки', узелСсылки)
            if (!узелСсылки) continue;

            await scrollToTheElement(vacancyNode);
            await waitForElementToBecomeVisible(vacancyNode);

            await откликнутьсяНаВакансию(узелСсылки)

            const buttonAttach = await getButtonAttachCoverLetter(vacancyNode, 'vacancy-response-letter-toggle', 5000)

            await attachCoverLetter(buttonAttach, 1000)

            const textarea = getTextAreaForCoverLetter(vacancyNode)

            await writeCoverLetter(textarea, coverLetter)

            const buttonSend = await getButtonSendCoverLetter(vacancyNode, 'vacancy-response-letter-submit', 2000)

            await sendCoverLetter(buttonSend, 2000)

            // console.log('yes', узелСсылки);
        } catch (err) {
            console.error(err.cause || err)

            isEnabledExtensions = false

            userScrollOn()

            chrome.runtime.sendMessage({type: 'error', content: err.message})

            break
        }
    }
}

// async function перебратьВсеВакансии() {
//     let i = 0
//     for (let vacancyNode of vacancyCollectionHtml) {
//         if (!isEnabledExtensions) break
//         const узелСсылки = findNodeByTagnameAndTextInTag(vacancyNode, 'SPAN', 'Откликнуться')?.parentNode
//
//         if (!узелСсылки) continue
//
//         await scrollToTheElement(vacancyNode)
//
//         await waitForElementToBecomeVisible(vacancyNode)
//
//         console.log('yes', узелСсылки)
//         i++
//         // const ссылкаОтклика = узелСсылки.href
//         //
//         // await откликнутьсяНаВакансию("https://vk.com/feed")
//
//         delete vacancyCollectionHtml[i]
//     }
// }

function откликнутьсяНаВакансиюТест(ссылка) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log("Откликнулись!")

            resolve()
        }, 1000)
    })
}
function откликнутьсяНаВакансию(ссылка, delayPromise = 0) {
    return new Promise((resolve, reject) => {
        // throw new Error('ошибка тест')
        setTimeout(() => {
            history.replaceState({}, document.title, window.location.pathname);
        }, 0);
        ссылка.addEventListener('click', function(event) {
            // Теперь у нас есть доступ к объекту события 'event'
            console.log(event); // Можете здесь исследовать объект события

            // Вы можете здесь предпринять любые действия,
            // например, предотвратить стандартное поведение кнопки, если это необходимо
            // event.preventDefault();

            if (event.defaultPrevented) {
                console.log('Навигация по новому URL предотвращена');
            } else {
                console.log('При клике произойдет навигация по новому URL');
            }

            event.preventDefault()
        });

        ссылка.click()

        setTimeout(() => {
            resolve()
        }, delayPromise)
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
//https://tyumen.hh.ru/applicant/vacancy_response?vacancyId=93155994&hhtmFrom=vacancy_search_list
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

function attachCoverLetter(button, delay = 2000) {
    return new Promise((resolve, reject) => {
        if (button) {
            setTimeout(() => {
                button.click()
                resolve()
            }, delay)
        } else {
            reject(new Error('Нету кнопки для прикрепления сопроводительного'))
        }
    })
}

function getButtonAttachCoverLetter(parentNode, attributeName, delay = 5000) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const button = parentNode.querySelector(`[data-qa="${attributeName}"]`)
            console.log(button)

            if (!button) reject(new Error('Кнопка для Прикрепления сопроводительного не найдена'))
            else resolve(button)
        }, delay)
    })
}

function getTextAreaForCoverLetter(parentNode) {
    return parentNode.querySelector('textarea[name="text"]')
}

function writeCoverLetter(field, text, delay = 2000) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (field) {
                field.value = text
                resolve()
            } else {
                reject(new Error('Не найдено поле куда вводить сопроводительное'))
            }
        }, delay)
    })
}

function getButtonSendCoverLetter(parentNode, attributeName, delay = 2000) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const button = parentNode.querySelector(`[data-qa="${attributeName}"]`)
            console.log(button)

            if (!button) reject(new Error('Кнопка для Отправки сопроводительного не найдена'))
            else resolve(button)
        }, delay)
    })
}

function sendCoverLetter(buttonSend, delay = 2000) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (buttonSend) {
                buttonSend.click()
                resolve()
            } else {
                reject(new Error('Нету кнопки для отправки сопроводительного'))
            }
        })
    }, delay)
}

function saveCurrentUrl() {
    const currentUrl = window.location.href

    chrome.runtime.sendMessage({type: 'saveUrl', currentUrl: currentUrl})
}

function goNextPage() {
    console.log('YES1')
    const pagerButtonNext = document.querySelector(`[data-qa="${'pager-next'}"]`)

    pagerButtonNext.click()

    setTimeout(() => перебратьВсеВакансии(), 10000)
}
// перебратьВсеВакансии()