const button = document.getElementById('switchButton')
const error = document.getElementsByClassName('error')[0]
const coverLetter = document.getElementById('coverLetter')

setTimeout(() => {
    console.log(coverLetter.value)
}, 10000)

chrome.storage.sync.get('coverLetter').then(items => {
    console.log(items.coverLetter)
})

let isHHtab
let isEnabledExtensions
let initialUrl

const test = {enabled: false}

coverLetter.addEventListener('input', () => {
    chrome.storage.sync.set({coverLetter: coverLetter.value})
})

// //Функции для возврата на предыдущую страницу
// function returnToPreviousPage() {
//     setTimeout(() => {
//         if (initialUrl) {
//             chrome.tabs.update({ url: initialUrl });
//             console.log('RETURN previous page:', initialUrl);
//         } else {
//             console.log('URL previous page NOT FOUND.');
//         }
//     }, 5000)
// }

// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//     if (changeInfo.url && changeInfo.status === 'loading' && changeInfo.url !== initialUrl) {
//         returnToPreviousPage()

//     }
// })

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'error') {
        offExtension()

        showError(message.content)
    }

    if (message.type === 'saveUrl') {
        initialUrl = message.currentUrl
    }
})

chrome.storage.sync.get("enabled").then(items => {
    console.log(items.enabled)
    isEnabledExtensions = items.enabled

    if (isEnabledExtensions) {
        button.innerText = 'Stop'
    }
})

chrome.storage.sync.get("coverLetter").then(items => {
    console.log(items.coverLetter)
    coverLetter.value = items.coverLetter
})

console.log(isEnabledExtensions)

button.addEventListener('click', (e) => {
    // Получаем ID текущей открытой вкладки
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0]
        const currentTabId = currentTab.id
        isHHtab = currentTab.url.includes('hh.ru')

        if (!isEnabledExtensions) {
            if (tabs.length > 0 && isHHtab) {
                // Отправляем сообщение на текущую страницу
                chrome.tabs.sendMessage(currentTabId, { type: 'executeFunction', coverLetter: coverLetter.value });
                // Сохраняем в стор расширений состояние что расширение запущено
                onExtension()
            } else {
                console.log("Страница с вашим контентным скриптом не открыта");
                showError('Зайдите на сайт hh!')
            }
        } else {
            if (tabs.length > 0 && isHHtab) {
                // Отправляем сообщение на текущую страницу
                chrome.tabs.sendMessage(currentTabId, { type: 'stopFunction' });
                // Сохраняем в стор расширений состояние что расширение остановлено
                offExtension()
            } else {
                console.log("Страница с вашим контентным скриптом не открыта");
                showError('Зайдите на сайт hh!')
            }
        }
    });
});

function onExtension() {
    // chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    //     const currentTab = tabs[0]
    //     const currentTabId = currentTab.id
    //     isHHtab = currentTab.url.includes('hh.ru')
    //
    //     if (tabs.length > 0 && isHHtab) {
    //         // Отправляем сообщение на текущую страницу
    //         chrome.tabs.sendMessage(currentTabId, { type: 'executeFunction' });
    //         // Сохраняем в стор расширений состояние что расширение запущено
    //         onExtension()
    //     } else {
    //         console.log("Страница с вашим контентным скриптом не открыта");
    //         warningHhLabel.style.display = 'flex'
    //         setTimeout(() => {
    //             warningHhLabel.style.display = 'none'
    //         }, 5000)
    //     }
    // });

    isEnabledExtensions = true
    chrome.storage.sync.set({enabled: true, coverLetter: coverLetter.value})

    button.innerText = 'Stop'
}

function offExtension() {
    // chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    //     const currentTab = tabs[0]
    //     const currentTabId = currentTab.id
    //     isHHtab = currentTab.url.includes('hh.ru')
    //
    //     if (tabs.length > 0 && isHHtab) {
    //         // Отправляем сообщение на текущую страницу
    //         chrome.tabs.sendMessage(currentTabId, { type: 'stopFunction' });
    //         // Сохраняем в стор расширений состояние что расширение остановлено
    //         offExtension()
    //     } else {
    //         console.log("Страница с вашим контентным скриптом не открыта");
    //         warningHhLabel.style.display = 'flex'
    //         setTimeout(() => {
    //             warningHhLabel.style.display = 'none'
    //         }, 5000)
    //     }
    // });

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

function sendMessageToEnableExtensions() {

}
