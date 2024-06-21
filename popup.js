const button = document.getElementById('switchButton')
const error = document.getElementsByClassName('error')[0]
const coverLetter = document.getElementById('coverLetter')
const vacanciesNumber = document.getElementById('numberVacancies')
const errorVacanciesList = document.getElementById('errorVacanciesList')
const errorVacanciesBlock = document.getElementById('errorVacanciesBlock')

let port
let isHHtab
let isEnabledExtensions


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'error') {
        offExtension()

        showError(message.content)
    }

    if (message.type === 'final') {
        offExtension()
    }

    if (message.type === 'redrawErrorVacansiesList') {
        createListErrorVacansies(message.content)
    }

    if (message.type === 'quantityVacancies') {
        vacanciesNumber.value = message.content

        const inputEvent = new Event('input', { bubbles: true })

        vacanciesNumber.dispatchEvent(inputEvent)
    }
})

chrome.storage.sync.get("enabled").then(items => {
    isEnabledExtensions = items.enabled

    if (isEnabledExtensions) {
        button.innerText = 'Stop'
    }
})

chrome.storage.sync.get("coverLetter").then(items => {
    coverLetter.value = items.coverLetter
})

chrome.storage.local.get("errorVacancies").then(items => {
    const errorVacancies = items.errorVacancies

    createListErrorVacansies(errorVacancies)
}).then(res => {
    checkResolveErrorVacansies()
})

chrome.storage.local.get('resolvedErrorVacancies').then((res) => {
    const resolvedErrorVacancies = res.resolvedErrorVacancies
    // resolvedErrorVacancies.filter(vacancy => vacancy !== clickedVacancy)

    // chrome.storage.local.set({resolvedErrorVacancies: resolvedErrorVacancies})
})

chrome.storage.sync.get('vacanciesNumber').then(res => {
    vacanciesNumber.value = res.vacanciesNumber || 0
})

document.addEventListener('DOMContentLoaded', () => {
    port = chrome.runtime.connect({ name: 'popup-connection' })

    port.postMessage({ message: 'HALO' })
})

coverLetter.addEventListener('input', () => {
    chrome.storage.sync.set({coverLetter: coverLetter.value})
})

errorVacanciesList.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
        chrome.storage.local.get({resolvedErrorVacancies: []}, (res) => {
            const resolvedErrorVacancies = res.resolvedErrorVacancies
            const clickedVacancy = e.target.innerText
    
            if (!resolvedErrorVacancies.includes(clickedVacancy)) {
                resolvedErrorVacancies.push(clickedVacancy)
            }
    
            chrome.storage.local.set({resolvedErrorVacancies: resolvedErrorVacancies})
        })
    }

    if (e.target.tagName === 'BUTTON') {
        chrome.storage.local.get({errorVacancies: []}, (res) => {
            const errorVacancies = res.errorVacancies
            const index = errorVacancies.findIndex((vacancy => vacancy.vacancyLabel === e.target.parentNode.innerText))

            errorVacancies.splice(index, 1)

            chrome.storage.local.set({errorVacancies: errorVacancies})

            createListErrorVacansies(errorVacancies)
            checkResolveErrorVacansies()
        })

        chrome.storage.local.get({resolvedErrorVacancies: []}, (res) => {
            const resolvedErrorVacancies = res.resolvedErrorVacancies
    
            const index = resolvedErrorVacancies.findIndex((vacancy => vacancy === e.target.parentNode.innerText))

            resolvedErrorVacancies.splice(index, 1)
    
            chrome.storage.local.set({resolvedErrorVacancies: resolvedErrorVacancies})
        })
    }
})

vacanciesNumber.addEventListener('input', (e) => {
    chrome.storage.sync.set({vacanciesNumber: e.target.value})
})

button.addEventListener('click', (e) => {
    // Получаем ID текущей открытой вкладки
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0]
        const currentTabId = currentTab.id
        isHHtab = currentTab.url.includes('hh.ru')

        if (!isEnabledExtensions) {
            if (tabs.length > 0 && isHHtab) {
                // Отправляем сообщение на текущую страницу
                chrome.tabs.sendMessage(currentTabId, { type: 'executeFunction', coverLetter: coverLetter.value, vacanciesNumber: +vacanciesNumber.value });
                // Сохраняем в стор расширений состояние что расширение запущено
                onExtension()
            } else {
                showError('Зайдите на сайт hh!')
            }
        } else {
            if (tabs.length > 0 && isHHtab) {
                // Отправляем сообщение на текущую страницу
                chrome.tabs.sendMessage(currentTabId, { type: 'stopFunction' });
                // Сохраняем в стор расширений состояние что расширение остановлено
                offExtension()
            } else {
                showError('Зайдите на сайт hh!')
            }
        }
    });
});



function checkResolveErrorVacansies() {
    document.querySelectorAll('a').forEach((link) => {
        chrome.storage.local.get("resolvedErrorVacancies").then(items => {
            if (items.resolvedErrorVacancies.includes(link.innerText)) {
                link.classList.add('visitedLink')
            }
        })
    })
}

function onExtension() {
    isEnabledExtensions = true
    chrome.storage.sync.set({enabled: true, coverLetter: coverLetter.value})

    button.innerText = 'Stop'
}

function offExtension() {
    isEnabledExtensions = false
    chrome.storage.sync.set({enabled: false})

    button.innerText = 'Start'
}

function showError(message) {
    if (error && message) {
        error.style.display = 'flex'

        const errorText = error.getElementsByClassName('error__text')[0]

        errorText.innerText = message
    }
}

function createListErrorVacansies(errorVacancies) {
    errorVacanciesList.innerHTML = ''

    if (errorVacancies.length > 0) {
        errorVacanciesBlock.style.display = 'block'
    } else {
        errorVacanciesBlock.style.display = 'none'
        return
    }

    for (let i = 0; i < errorVacancies.length; i++) {
        const newListItem = document.createElement('li')
        const newLinkItem = document.createElement('a')
        const newButtonClose = document.createElement('button')

        newButtonClose.classList.add('errorVacanciesList__item-close')

        newLinkItem.target = "_blank"
        newLinkItem.href = errorVacancies[i]?.vacancyLink
        newLinkItem.textContent = errorVacancies[i]?.vacancyLabel
        newLinkItem.classList.add('errorVacanciesList__link')

        newListItem.classList.add('errorVacanciesList__item')
        newListItem.appendChild(newLinkItem)
        newListItem.appendChild(newButtonClose)

        errorVacanciesList.appendChild(newListItem)
    }
}