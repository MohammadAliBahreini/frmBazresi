// فایل: script.js

// ✅ Logger حرفه‌ای برای اشکال‌زدایی
const Logger = {
  logLevel: 'debug',
  logEntries: [],

  init() {
    try {
      Logger.log('✅ Logger راه‌اندازی شد');
    } catch (err) {
      console.error('خطا در Logger:', err);
    }
  },

  log(message, level = 'info', data = null) {
    const timestamp = new Date().toISOString();
    const entry = { timestamp, level, message, data };
    this.logEntries.push(entry);

    if (this.shouldLog(level)) {
      console[this.getConsoleMethod(level)](
        `[${timestamp}] [${level.toUpperCase()}] ${message}`,
        data || ''
      );
    }

    this.displayInDebugPanel(entry);
  },

  shouldLog(level) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.logLevel];
  },

  getConsoleMethod(level) {
    return { debug: 'log', info: 'info', warn: 'warn', error: 'error' }[level] || 'log';
  },

  displayInDebugPanel(entry) {
    const panel = document.getElementById('debugPanel');
    if (!panel) return;
    const p = document.createElement('p');
    p.className = `log-${entry.level}`;
    p.textContent = `[${new Date(entry.timestamp).toLocaleTimeString()}] [${entry.level.toUpperCase()}] ${entry.message}`;
    if (entry.data) {
      const d = typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data);
      p.textContent += ` - ${d.length > 200 ? d.substring(0, 200) + '...' : d}`;
    }
    panel.appendChild(p);
    panel.scrollTop = panel.scrollHeight;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Logger.init();

  // 🗓 درج تاریخ شمسی و ساعت
  try {
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const jalali = new persianDate(now).format('YYYY/MM/DD');
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const d = document.getElementById('visitDate');
    const t = document.getElementById('visitTime');
    if (d) d.value = jalali;
    if (t) t.value = time;

    Logger.log('🗓 تاریخ و ساعت درج شد', 'info', { jalali, time });
  } catch (e) {
    Logger.log('خطا در درج تاریخ و ساعت', 'error', e);
  }

  // 📅 تقویم شمسی
  if (typeof $.fn.persianDatepicker === 'function') {
    $('.persian-datepicker').persianDatepicker({
      format: 'YYYY/MM/DD',
      initialValueType: 'persian',
      autoClose: true,
      responsive: true,
      theme: 'light',
      calendar: { persian: { locale: 'fa' } },
      onSelect: unix => {
        Logger.log('تاریخ انتخاب شد', 'info', new persianDate(unix).format('YYYY/MM/DD'));
      }
    });
  } else {
    Logger.log('📛 PersianDatepicker لود نشده', 'error');
  }

  // ✍️ SignaturePad برای امضاها
  if (typeof SignaturePad === 'function') {
    const inspectorCanvas = document.getElementById('inspectorSignature');
    const managerCanvas = document.getElementById('centerManagerSignature');

    if (inspectorCanvas && managerCanvas) {
      const inspectorPad = new SignaturePad(inspectorCanvas);
      const managerPad = new SignaturePad(managerCanvas);

      const resizeCanvas = (canvas, pad) => {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext('2d').scale(ratio, ratio);
        pad.clear();
      };

      resizeCanvas(inspectorCanvas, inspectorPad);
      resizeCanvas(managerCanvas, managerPad);

      window.addEventListener('resize', () => {
        resizeCanvas(inspectorCanvas, inspectorPad);
        resizeCanvas(managerCanvas, managerPad);
      });

      document.getElementById('clearInspectorSignature')?.addEventListener('click', () => {
        inspectorPad.clear();
        Logger.log('🧼 امضای بازرس پاک شد');
      });

      document.getElementById('clearCenterManagerSignature')?.addEventListener('click', () => {
        managerPad.clear();
        Logger.log('🧼 امضای مدیر مرکز پاک شد');
      });

      document.getElementById('inspectionForm')?.addEventListener('submit', function (e) {
        const iData = inspectorPad.isEmpty() ? '' : inspectorPad.toDataURL();
        const mData = managerPad.isEmpty() ? '' : managerPad.toDataURL();

        const hiddenI = document.createElement('input');
        hiddenI.type = 'hidden';
        hiddenI.name = 'inspectorSignature';
        hiddenI.value = iData;
        this.appendChild(hiddenI);

        const hiddenM = document.createElement('input');
        hiddenM.type = 'hidden';
        hiddenM.name = 'centerManagerSignature';
        hiddenM.value = mData;
        this.appendChild(hiddenM);

        Logger.log('✉️ امضاها ضمیمه شدند به فرم');
      });
    } else {
      Logger.log('⚠️ Canvas امضا پیدا نشد', 'warn');
    }
  } else {
    Logger.log('📛 SignaturePad لود نشده', 'error');
  }

  // 📍 موقعیت مکانی (Geolocation)
  const getLocationBtn = document.getElementById('getLocation');
  const latitudeInput = document.getElementById('latitude');
  const longitudeInput = document.getElementById('longitude');

  if (getLocationBtn && latitudeInput && longitudeInput) {
    getLocationBtn.addEventListener('click', () => {
      if (!navigator.geolocation) {
        alert('❌ مرورگر شما از Geolocation پشتیبانی نمی‌کند.');
        return;
      }

      Logger.log('📡 درحال دریافت موقعیت مکانی…');

      navigator.geolocation.getCurrentPosition(
        pos => {
          const lat = pos.coords.latitude.toFixed(6);
          const lon = pos.coords.longitude.toFixed(6);
          latitudeInput.value = lat;
          longitudeInput.value = lon;
          Logger.log('✅ مختصات دریافت شد', 'info', { lat, lon });
        },
        err => {
          let msg = '⚠️ خطا در دریافت موقعیت: ';
          switch (err.code) {
            case err.PERMISSION_DENIED: msg += 'دسترسی رد شد'; break;
            case err.POSITION_UNAVAILABLE: msg += 'موقعیت دردسترس نیست'; break;
            case err.TIMEOUT: msg += 'مهلت تمام شد'; break;
            default: msg += 'خطای ناشناخته';
          }
          Logger.log(msg, 'error', err);
          alert(msg);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  } else {
    Logger.log('🔍 عناصر موقعیت مکانی یافت نشدند', 'warn');
  }
  // ✅ اعتبارسنجی فیلدهای عددی
  const validateNumeric = (id, expectedLength) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('input', function () {
      const group = this.closest('.form-group');
      this.value = this.value.replace(/\D/g, '').substring(0, expectedLength);
      const valid = this.value.length === expectedLength;
      group?.classList.toggle('error', !valid && this.value.trim() !== '');
      group?.classList.toggle('success', valid);
    });
  };

  validateNumeric('billId', 13);
  validateNumeric('meterSerial', 11);

  // ☎️ اعتبارسنجی شماره تلفن مدیر انرژی
  const phoneInput = document.getElementById('energyManagerPhone');
  if (phoneInput) {
    phoneInput.addEventListener('input', function () {
      const group = this.closest('.form-group');
      const phonePattern = /^09\d{9}$|^0\d{10}$/;
      const val = this.value.trim();
      const valid = val === '' || phonePattern.test(val);
      group?.classList.toggle('error', val !== '' && !valid);
      group?.classList.toggle('success', valid);
    });
  }

  // 🚀 ارسال فرم با AJAX به WordPress
  const form = document.getElementById('inspectionForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const formData = new FormData(form);
      formData.append('action', 'my_inspection_form_save');
      formData.append('nonce', document.querySelector('[name="inspection_nonce"]')?.value || '');

      fetch(myInspectionFormAjax.ajaxurl, {
        method: 'POST',
        body: formData
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            alert('✅ فرم با موفقیت ثبت شد!');
            form.reset();
            Logger.log('🟢 فرم ذخیره شد', 'info', data);
          } else {
            alert('❌ ' + (data.data?.message || 'خطا در ثبت فرم'));
            Logger.log('⚠️ خطا در ذخیره', 'warn', data);
          }
        })
        .catch(err => {
          alert('⛔ خطا در ارتباط با سرور');
          Logger.log('❌ AJAX Error', 'error', err);
        });
    });
  } else {
    Logger.log('📛 فرم اصلی یافت نشد', 'error');
  }
});

