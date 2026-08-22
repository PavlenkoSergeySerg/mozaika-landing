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

    console.log('✅ Скрипты лендинга загружены');
});
