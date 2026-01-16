import { eventSource, event_types, saveSettingsDebounced, setExtensionPrompt, extension_prompt_types } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

const extensionName = 'outfit-monitor';

const defaultSettings = {
    isEnabled: true,
    outfit: {
        outerWear: '',
        top: '',
        bottom: '',
        dress: '',
        underwear: '',
        accessories: '',
        shoes: '',
        features: ''
    }
};

function getSettings() {
    return extension_settings[extensionName];
}

function parseAIMessage(text) {
    const s = getSettings();
    let updated = false;

    if (/(сняла?|снял|разделась|разделся|скинула?)/gi.test(text)) {
        if (/куртк|пальто|плащ|пиджак/gi.test(text)) {
            s.outfit.outerWear = '';
            updated = true;
            console.log('[Outfit] Снята верхняя одежда');
        }
        if (/футболк|рубашк|свитер|майк|топ|блузк/gi.test(text)) {
            s.outfit.top = '';
            updated = true;
            console.log('[Outfit] Снят верх');
        }
        if (/джинс|штан|брюк|шорт|юбк/gi.test(text)) {
            s.outfit.bottom = '';
            updated = true;
            console.log('[Outfit] Снят низ');
        }
        if (/платье|сарафан|комбинезон/gi.test(text)) {
            s.outfit.dress = '';
            updated = true;
            console.log('[Outfit] Снято платье');
        }
        if (/трус|белье|лифчик|бюстгальтер/gi.test(text)) {
            s.outfit.underwear = '';
            updated = true;
            console.log('[Outfit] Снято бельё');
        }
        if (/туфл|ботинк|кроссовк|сапог|обувь/gi.test(text)) {
            s.outfit.shoes = '';
            updated = true;
            console.log('[Outfit] Снята обувь');
        }
        if (/босиком|босая|разулась/gi.test(text)) {
            s.outfit.shoes = 'Босиком';
            updated = true;
            console.log('[Outfit] Босиком');
        }
    }

    if (/(надел[аи]|одел[аи]|облачилась)/gi.test(text)) {
        const dressMatch = text.match(/(?:надел[аи]|одел[аи]) ([^.!?,]*(?:платье|сарафан|комбинезон)[^.!?,]*)/gi);
        if (dressMatch) {
            s.outfit.dress = dressMatch[0].replace(/надел[аи]|одел[аи]/gi, '').trim();
            s.outfit.top = '';
            s.outfit.bottom = '';
            updated = true;
            console.log('[Outfit] Надето платье:', s.outfit.dress);
        }
    }

    if (/(полностью разделась|полностью раздет[аы]й|голая|голый|нагая)/gi.test(text)) {
        s.outfit.outerWear = '';
        s.outfit.top = '';
        s.outfit.bottom = '';
        s.outfit.dress = '';
        s.outfit.underwear = '';
        s.outfit.shoes = 'Босиком';
        updated = true;
        console.log('[Outfit] Полное раздевание');
    }

    if (/мокр[аы][яеи]* волос/gi.test(text)) {
        s.outfit.features = 'Мокрые волосы';
        updated = true;
    }

    if (updated) {
        saveSettingsDebounced();
        syncUI();
        updatePromptInjection();
    }

    return updated;
}

function updatePromptInjection() {
    const s = getSettings();

    if (!s.isEnabled) {
        setExtensionPrompt(extensionName, '', extension_prompt_types.IN_CHAT, 0);
        return;
    }

    const outfit = [];
    if (s.outfit.outerWear) outfit.push(`🧥 Верхняя одежда: ${s.outfit.outerWear}`);
    if (s.outfit.dress) {
        outfit.push(`👗 Платье: ${s.outfit.dress}`);
    } else {
        if (s.outfit.top) outfit.push(`👕 Верх: ${s.outfit.top}`);
        if (s.outfit.bottom) outfit.push(`👖 Низ: ${s.outfit.bottom}`);
    }
    if (s.outfit.underwear) outfit.push(`🩲 Бельё: ${s.outfit.underwear}`);
    if (s.outfit.accessories) outfit.push(`💍 Аксессуары: ${s.outfit.accessories}`);
    if (s.outfit.shoes) outfit.push(`👟 Обувь: ${s.outfit.shoes}`);
    if (s.outfit.features) outfit.push(`✨ Особенности: ${s.outfit.features}`);

    if (outfit.length === 0) {
        setExtensionPrompt(extensionName, '', extension_prompt_types.IN_CHAT, 0);
        return;
    }

    let prompt = `[OOC: 👔 АУТФИТ {{user}}:\n${outfit.join('\n')}\n⚠️ Учитывай одежду в описаниях!]`;

    setExtensionPrompt(extensionName, prompt, extension_prompt_types.IN_CHAT, 0);
    console.log('[Outfit] Промпт обновлён');
}

function syncUI() {
    const s = getSettings();

    const enabledCheck = $('#outfit-enabled');
    if (enabledCheck.length) enabledCheck.prop('checked', s.isEnabled);

    $('#outfit-outer-display').text(s.outfit.outerWear || '—');
    $('#outfit-top-display').text(s.outfit.top || '—');
    $('#outfit-bottom-display').text(s.outfit.bottom || '—');
    $('#outfit-dress-display').text(s.outfit.dress || '—');
    $('#outfit-underwear-display').text(s.outfit.underwear || '—');
    $('#outfit-accessories-display').text(s.outfit.accessories || '—');
    $('#outfit-shoes-display').text(s.outfit.shoes || '—');
    $('#outfit-features-display').text(s.outfit.features || '—');
}

function makeEditable(selector, settingPath) {
    $(document).on('click', selector, function() {
        const current = $(this).text().trim();
        const newValue = prompt('Введите новое значение:', current === '—' ? '' : current);

        if (newValue !== null) {
            const s = getSettings();
            const path = settingPath.split('.');

            if (path.length === 2) {
                s[path[0]][path[1]] = newValue;
            }

            saveSettingsDebounced();
            syncUI();
            updatePromptInjection();
        }
    });
}

function setupUI() {
    try {
        const settingsHtml = `
<div class="outfit-monitor-settings">
    <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
            <b>👔 Outfit Monitor</b>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
            <label class="checkbox_label">
                <input type="checkbox" id="outfit-enabled">
                <span>Включить мониторинг</span>
            </label>
            <hr>

            <div class="outfit-glass-panel">
                <div class="outfit-section-title">👔 АУТФИТ {{user}}</div>

                <div class="outfit-info-row">
                    <span class="outfit-label">🧥 Верхняя одежда:</span>
                    <span class="outfit-value editable" id="outfit-outer-display">—</span>
                </div>

                <div class="outfit-info-row">
                    <span class="outfit-label">👕 Верх:</span>
                    <span class="outfit-value editable" id="outfit-top-display">—</span>
                </div>

                <div class="outfit-info-row">
                    <span class="outfit-label">👖 Низ:</span>
                    <span class="outfit-value editable" id="outfit-bottom-display">—</span>
                </div>

                <div class="outfit-info-row">
                    <span class="outfit-label">👗 Платье:</span>
                    <span class="outfit-value editable" id="outfit-dress-display">—</span>
                </div>

                <div class="outfit-info-row">
                    <span class="outfit-label">🩲 Бельё:</span>
                    <span class="outfit-value editable" id="outfit-underwear-display">—</span>
                </div>

                <div class="outfit-info-row">
                    <span class="outfit-label">💍 Аксессуары:</span>
                    <span class="outfit-value editable" id="outfit-accessories-display">—</span>
                </div>

                <div class="outfit-info-row">
                    <span class="outfit-label">👟 Обувь:</span>
                    <span class="outfit-value editable" id="outfit-shoes-display">—</span>
                </div>

                <div class="outfit-info-row">
                    <span class="outfit-label">✨ Особенности:</span>
                    <span class="outfit-value editable" id="outfit-features-display">—</span>
                </div>
            </div>

            <small style="opacity: 0.5; margin-top: 10px; display: block;">
                💡 Кликни на поле чтобы изменить вручную
            </small>
        </div>
    </div>
</div>

<style>
.outfit-monitor-settings .inline-drawer-content {
    padding: 10px;
}

.outfit-glass-panel {
    margin-top: 10px;
    padding: 15px;
    background: rgba(255, 159, 243, 0.08);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    border: 1px solid rgba(255, 159, 243, 0.2);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(255, 159, 243, 0.15);
}

.outfit-section-title {
    font-size: 13px;
    font-weight: 600;
    color: #ff9ff3;
    margin-bottom: 10px;
    letter-spacing: 0.5px;
}

.outfit-info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.outfit-info-row:last-child {
    border-bottom: none;
}

.outfit-label {
    font-size: 12px;
    opacity: 0.7;
}

.outfit-value {
    font-weight: 500;
    color: #ff9ff3;
    font-size: 12px;
}

.outfit-value.editable {
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: all 0.2s ease;
}

.outfit-value.editable:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-1px);
}

hr {
    margin: 10px 0;
    border-color: var(--SmartThemeBorderColor);
    opacity: 0.3;
}
</style>
    `;

    $('#extensions_settings2').append(settingsHtml);

    $('#outfit-enabled').on('change', function() {
        getSettings().isEnabled = this.checked;
        saveSettingsDebounced();
        updatePromptInjection();
    });

    makeEditable('#outfit-outer-display', 'outfit.outerWear');
    makeEditable('#outfit-top-display', 'outfit.top');
    makeEditable('#outfit-bottom-display', 'outfit.bottom');
    makeEditable('#outfit-dress-display', 'outfit.dress');
    makeEditable('#outfit-underwear-display', 'outfit.underwear');
    makeEditable('#outfit-accessories-display', 'outfit.accessories');
    makeEditable('#outfit-shoes-display', 'outfit.shoes');
    makeEditable('#outfit-features-display', 'outfit.features');

    syncUI();
    } catch (error) {
        console.error('[Outfit] Ошибка setupUI:', error);
    }
}

function loadSettings() {
    try {
        if (!extension_settings[extensionName]) {
            extension_settings[extensionName] = JSON.parse(JSON.stringify(defaultSettings));
        } else {
            for (const key in defaultSettings) {
                if (extension_settings[extensionName][key] === undefined) {
                    extension_settings[extensionName][key] = defaultSettings[key];
                }
            }
        }
        console.log('[Outfit] Настройки загружены');
    } catch (error) {
        console.error('[Outfit] Ошибка загрузки:', error);
        extension_settings[extensionName] = JSON.parse(JSON.stringify(defaultSettings));
    }
}

jQuery(async () => {
    try {
        console.log('[Outfit] Инициализация...');

        loadSettings();
        console.log('[Outfit] Settings OK');
        
        setupUI();
        console.log('[Outfit] UI OK');
        
        updatePromptInjection();
        console.log('[Outfit] Prompt OK');

        eventSource.on(event_types.MESSAGE_RECEIVED, () => {
            const chat = window.chat || [];
            if (chat.length === 0) return;

            const lastMessage = chat[chat.length - 1];
            if (!lastMessage || lastMessage.is_user) return;

            console.log('[Outfit] Парсинг...');
            parseAIMessage(lastMessage.mes);
        });

        eventSource.on(event_types.MESSAGE_SENT, () => {
            updatePromptInjection();
        });

        console.log('[Outfit] ✅ Загружено');
    } catch (error) {
        console.error('[Outfit] ❌ FATAL:', error);
    }
});
