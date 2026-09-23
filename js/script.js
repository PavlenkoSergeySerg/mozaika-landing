// ========================================
// СКРИПТЫ ЛЕНДИНГА АЛМАЗНОЙ МОЗАИКИ
// ========================================

// Ждём полной загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    
    // --- БУРГЕР-МЕНЮ ---
    const burger = document.querySelector('.burger-menu');
    const navMenu = document.querySelector('.nav-menu');

    if (burger && navMenu) {
        // Открытие/закрытие меню по клику на бургер
        burger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            burger.classList.toggle('active');
        });

        // Закрытие меню при клике на любую ссылку
        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                burger.classList.remove('active');
            });
        });

        // Закрытие меню при клике вне его
        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !burger.contains(e.target)) {
                navMenu.classList.remove('active');
                burger.classList.remove('active');
            }
        });
    }

    // --- ПЛАВНЫЙ СКРОЛЛ ПО ЯКОРНЫМ ССЫЛКАМ ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // --- ВАЛИДАЦИЯ ФОРМЫ ЗАКАЗА ---
    // Показать красную подсказку под полем
    function showError(field, message) {
        const group = field.closest('.form-group');
        if (!group) return;
        group.classList.add('error');
        let err = group.querySelector('.error-message');
        if (!err) {
            err = document.createElement('div');
            err.className = 'error-message';
            group.appendChild(err);
        }
        err.textContent = message;
    }

    // Очистить все ошибки (включая общее красное сообщение)
    function clearErrors(form) {
        form.querySelectorAll('.form-group.error').forEach(g => g.classList.remove('error'));
        form.querySelectorAll('.error-message').forEach(e => e.remove());
        const msg = form.querySelector('.form-message');
        if (msg) {
            msg.className = 'form-message';
            msg.textContent = '';
        }
    }

    // Телефон: разрешаем только цифры и + ( ) - пробел
    document.querySelectorAll('input[name="phone"]').forEach(phone => {
        phone.addEventListener('input', () => {
            phone.value = phone.value.replace(/[^\d+()\-\s]/g, '');
        });
    });

    // --- HEIC/HEIF → JPEG: конвертация на клиенте (Safari/iOS декодирует HEIC нативно) ---
function convertHeicToJpeg(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            canvas.toBlob((blob) => {
                if (!blob) return reject(new Error('convert failed'));
                resolve(new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' }));
            }, 'image/jpeg', 0.9);
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('HEIC не читается')); };
        img.src = url;
    });
}

    // Проверка формы при отправке
    document.querySelectorAll('.form').forEach(form => {
        // --- Ступень воронки: пользователь прикрепил фото к форме ---
        const photoInput = form.querySelector('input[type="file"][name="photo"]');
    if (photoInput) {
        // Ступень воронки: фото прикреплено
        photoInput.addEventListener('change', () => {
            // гасим красную подсказку, как только файл выбран
            const group = photoInput.closest('.form-group');
            if (group) {
                group.classList.remove('error');
                const em = group.querySelector('.error-message');
                if (em) em.remove();
            }
            if (photoInput.files && photoInput.files.length > 0) {
                if (typeof ym === 'function') ym(112057294, 'reachGoal', 'photo_uploaded');
            }
        });

        // Мобильный кейс: поле фото вне экрана → нативный пузырь не виден.
        // invalid срабатывает, когда браузер завернул отправку из-за фото
        photoInput.addEventListener('invalid', () => {
            showError(photoInput, 'Вы забыли загрузить фото');
            photoInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        
            // --- "Дыра": попытка отправки БЕЗ фото (ловим на клике: нативная
        // валидация браузера не пропускает submit без required-полей) ---
        const submitBtnEl = form.querySelector('.btn-submit');
        if (submitBtnEl) {
        submitBtnEl.addEventListener('click', () => {
            const nameOk = (form.querySelector('input[name="name"]')?.value.trim().length || 0) >= 2;
            const phoneDigits = (form.querySelector('input[name="phone"]')?.value || '').replace(/\D/g, '');
            const phoneOk = phoneDigits.length >= 10 && phoneDigits.length <= 11;
            const sizeOk = !!form.querySelector('select[name="size"]')?.value;
            const consentOk = !!form.querySelector('input[name="consent"]')?.checked;
            // считаем только "форма заполнена, но фото нет" — чистая дыра
            if (!photoInput.files.length && nameOk && phoneOk && sizeOk && consentOk) {
                if (typeof ym === 'function') ym(112057294, 'reachGoal', 'no_photo_submit_attempt');
            }
        });
    }
}
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); // не отправляем, пока не пройдёт проверку
            clearErrors(form);

            let isValid = true;
            const errors = []; // список незаполненных полей

            // Имя
            const name = form.querySelector('input[name="name"]');
            if (name.value.trim().length < 2) {
                showError(name, 'Укажите имя (минимум 2 символа)');
                errors.push('имя');
                isValid = false;
            }

            // Телефон: 10–11 цифр
            const phone = form.querySelector('input[name="phone"]');
            const digits = phone.value.replace(/\D/g, '');
            if (digits.length < 10 || digits.length > 11) {
                showError(phone, 'Укажите корректный телефон, например +7 (900) 123-45-67');
                errors.push('телефон');
                isValid = false;
            }

            // Размер
            const size = form.querySelector('select[name="size"]');
            if (!size.value) {
                showError(size, 'Выберите размер мозаики');
                errors.push('размер');
                isValid = false;
            }

            // Фото
            const photo = form.querySelector('input[name="photo"]');
            if (!photo.files.length) {
            errors.push('фото');
            showError(photo, 'Прикрепите фото (JPG/PNG/HEIC)');
            isValid = false;
            }
            else if (photo.files[0].size > 20 * 1024 * 1024) {
                showError(photo, 'Файл больше 20 МБ — выберите фото поменьше');
                errors.push('фото (файл слишком большой)');
                isValid = false;
            }

            // Согласие
            const consent = form.querySelector('input[name="consent"]');
            if (!consent.checked) {
                showError(consent, 'Нужно согласие на обработку данных');
                errors.push('согласие');
                isValid = false;
            }

            // Если есть ошибки — красное сообщение со списком
            if (!isValid) {
                const message = form.querySelector('.form-message');
                message.className = 'form-message error';
                message.textContent = '⚠️ Заявка не отправлена. Заполните поля: ' + errors.join(', ') + '. Подробности подсвечены красным у каждого поля.';
                return;
            }

                       // --- ОТПРАВКА НА СЕРВЕР (AJAX, без перезагрузки страницы) ---
                       const submitBtn = form.querySelector('.btn-submit');
                       const message = form.querySelector('.form-message');
           
                       // Защита от двойного клика
                       submitBtn.disabled = true;
                       submitBtn.textContent = 'Отправляем...';

                       // HEIC конвертируем в JPEG до отправки (сервер принимает только jpg/png/webp)
                        let convertedPhoto = null;
                        const photoFile = photo.files[0];
                        const isHeic = photoFile && (/\.(heic|heif)$/i.test(photoFile.name) || /heic|heif/i.test(photoFile.type));
                        if (isHeic) {
                        try {
                        convertedPhoto = await convertHeicToJpeg(photoFile);
                        } catch (err) {
                        message.className = 'form-message error';
                        message.textContent = '⚠️ Не удалось преобразовать HEIC. Сохраните фото как JPEG или PNG и загрузите снова.';
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Отправить заявку';
                        return;
                        }
            }
           
                       
                       const formData = new FormData(form);
                        if (convertedPhoto) formData.set('photo', convertedPhoto, convertedPhoto.name);
           
                       fetch('php/send.php', {
                           method: 'POST',
                           body: formData
                       })
                       .then(response => response.json())
                       .then(data => {
                        if (data.success) {
                            // Цель Метрики: заявка отправлена
                            if (typeof ym === 'function') {
                                ym(112057294, 'reachGoal', 'order_sent');
                            }
                            message.className = 'form-message success';
                            message.textContent = '✅ ' + data.message;
                            form.reset(); // очищаем форму после успеха
                        
                           } else {
                               message.className = 'form-message error';
                               message.textContent = '⚠️ ' + (data.message || 'Не удалось отправить заявку. Попробуйте ещё раз.');
                           }
                       })
                       .catch(() => {
                           message.className = 'form-message error';
                           message.textContent = '⚠️ Ошибка связи с сервером. Проверьте интернет и попробуйте ещё раз.';
                       })
                       .finally(() => {
                           submitBtn.disabled = false;
                           submitBtn.textContent = 'Отправить заявку';
                       });
        });
    });

    console.log('✅ Скрипты лендинга загружены');
});

// --- Липкий CTA: прячем, когда форма заказа видна на экране ---
document.addEventListener('DOMContentLoaded', () => {
    const cta = document.querySelector('.mobile-cta');
    const orderSection = document.getElementById('order-form');
    if (!cta || !orderSection || !('IntersectionObserver' in window)) return;

    const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
            cta.classList.toggle('is-hidden', en.isIntersecting);
        });
    }, { threshold: 0.2 });
    io.observe(orderSection);

    // Опционально: цель Метрики на клик по липкой кнопке (для анализа воронки)
    cta.addEventListener('click', () => {
        if (typeof ym === 'function') ym(112057294, 'reachGoal', 'mobile_cta_click');
    });
});

