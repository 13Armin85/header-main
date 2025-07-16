// این تابع زمانی اجرا می‌شود که کل ساختار صفحه (DOM) به طور کامل بارگذاری شده باشد
$(document).ready(function() {

    // --- بخش متغیرهای سراسری و اولیه ---

    // خواندن لیست علاقه‌مندی‌ها از حافظه محلی مرورگر (localStorage) یا ایجاد یک آرایه خالی
    const initialFavorites = JSON.parse(localStorage.getItem('favoriteItems')) || [];
    // تبدیل آرایه به یک Set برای دسترسی و جستجوی سریع‌تر
    const favoriteItems = new Set(initialFavorites);
    // خواندن لیست تاریخچه بازدیدها از حافظه محلی
    let historyItems = JSON.parse(localStorage.getItem('historyItems')) || [];
    // خواندن تاریخچه جستجوهای اصلی از حافظه محلی
    let mainSearchHistory = JSON.parse(localStorage.getItem('mainSearchHistory')) || [];

    // انتخاب عناصر مهم صفحه با jQuery برای استفاده‌های بعدی
    const $activeItemContainer = $("#active-item-container"); // نگهدارنده آیتم فعال در هدر
    const $activeItemText = $("#active-item-text"); // متن آیتم فعال
    const $activeItemStar = $("#active-item-star"); // ستاره آیتم فعال
    const $mainSearchInput = $(".search-input"); // اینپوت اصلی جستجو در هدر
    const $mainSearchDropdown = $("#mainSearchDropdown"); // دراپ‌دان نتایج جستجوی اصلی

    // --- توابع کمکی (Helper Functions) ---

    /**
     * متن‌های طولانی را در یک سلکتور مشخص کوتاه کرده و سه نقطه به انتهایشان اضافه می‌کند.
     * همچنین متن کامل را برای نمایش در تولتیپ ذخیره می‌کند.
     * @param {string} selector - سلکتور CSS برای انتخاب لینک‌ها
     */
    function truncateAndTooltipify(selector) {
        $(selector).each(function() {
            const $link = $(this);
            // متن کامل را از اتریبیوت 'data-full-text' یا خود لینک می‌خواند
            const fullText = $link.attr('data-full-text') || $link.text().trim();

            if (fullText.length > 50) {
                const truncatedText = fullText.substring(0, 30) + "...";
                $link.text(truncatedText);
                $link.attr('data-tooltip-text', fullText); // برای استفاده تولتیپ
                $link.removeAttr('title'); // حذف تولتیپ پیش‌فرض مرورگر
            }

            // اطمینان از اینکه متن کامل همیشه در 'data-full-text' ذخیره شده باشد
            if (!$link.attr('data-full-text')) {
                $link.attr('data-full-text', fullText);
            }
        });
    }

    /**
     * تمام دراپ‌دان‌های باز که پین نشده‌اند را می‌بندد.
     * @param {string|null} excludeId - آی‌دی دراپ‌دانی که نباید بسته شود
     */
    function closeAllNonPinnedDropdowns(excludeId = null) {
        $(".sidebar-dropdown, .history-dropdown, .favorites-dropdown, .notification-dropdown, .profile-dropdown, .search-options-dropdown, .main-search-dropdown").each(function() {
            const $dropdown = $(this);
            // اگر دراپ‌دان باز است، پین نشده و آی‌دی آن مستثنی نیست، آن را با انیمیشن ببند
            if ($dropdown.hasClass("show") && $dropdown.attr("id") !== excludeId && !$dropdown.hasClass("pinned")) {
                $dropdown.hide("blind", { direction: "vertical" }, 100).removeClass("show");
            }
        });
        // کلاس 'active' را از تمام آیتم‌های منو حذف می‌کند
        $('.menu-item-wrapper').removeClass('wrapper--active');
    }

    /**
     * یک قطعه HTML برای نمایش حالت خالی (وقتی داده‌ای وجود ندارد) ایجاد می‌کند.
     * @param {string} message - پیامی که باید نمایش داده شود
     * @returns {string} - رشته HTML
     */
    function createEmptyStateHTML(message) {
        return `
            <div class="empty-state-container">
                <img src="images/no-data-sm 1.svg" alt="یافت نشد" />
                <p>${message}</p>
            </div>
        `;
    }

    // --- توابع مدیریت جستجوی اصلی ---

    /**
     * یک عبارت جستجو شده را به ابتدای تاریخچه جستجوهای اصلی اضافه می‌کند.
     * @param {string} term - عبارت جستجو شده
     * @param {string} category - دسته‌بندی انتخاب شده برای جستجو
     */
    function updateMainSearchHistory(term, category) {
        if (!term || !category) return;
        // حذف موارد تکراری
        mainSearchHistory = mainSearchHistory.filter(item => item.term !== term);
        // اضافه کردن آیتم جدید به ابتدای لیست
        mainSearchHistory.unshift({ term: term, category: category });
        // محدود کردن تاریخچه به ۵ آیتم آخر
        if (mainSearchHistory.length > 5) mainSearchHistory.pop();
        // ذخیره در حافظه محلی
        localStorage.setItem('mainSearchHistory', JSON.stringify(mainSearchHistory));
    }

    /**
     * لیست تاریخچه جستجوهای اصلی را در دراپ‌دان نمایش می‌دهد.
     */
    function displayMainSearchHistory() {
        $mainSearchDropdown.empty().show("blind", { direction: "vertical" }, 100).addClass('show');
        if (mainSearchHistory.length > 0) {
            $mainSearchDropdown.append('<div class="search-history-header">جستجوهای اخیر</div>');

            $.each(mainSearchHistory, function(index, item) {
                let displayText = item.term;
                let tooltipText = item.category;
                if (item.term.length > 30) {
                    displayText = item.term.substring(0, 25) + "...";
                    tooltipText = `${item.term} (${item.category})`;
                }
                const $historyLink = $("<a>").attr("href", "#")
                    .addClass('history-search-item')
                    .text(displayText)
                    .attr('title', tooltipText);

                const $removeIcon = $("<i>").addClass("fas fa-times remove-history-icon").data('term', item.term);
                $historyLink.append($removeIcon);
                $mainSearchDropdown.append($historyLink);
            });
        } else {
            $mainSearchDropdown.append(createEmptyStateHTML("تاریخچه جستجو خالی است."));
        }
    }

    /**
     * جستجوی اصلی را بر اساس عبارت ورودی اجرا کرده و دکمه نمایش نتایج را نشان می‌دهد.
     * @param {string} term - عبارت جستجو شده
     */
    function executeMainSearch(term) {
        if (!term) return;
        const selectedCategory = $("#searchOptionsDropdown a.selected").text().trim();
        updateMainSearchHistory(term, selectedCategory);
        $mainSearchDropdown.empty().show().addClass('show');
        const results = [];
        // جستجو در تمام آیتم‌های منوی "همه"
        $("#sidebarDropdown .sidebar-item-wrapper a").each(function() {
            const fullText = $(this).attr('data-full-text') || $(this).text();
            if (fullText.toLowerCase().includes(term.toLowerCase())) {
                results.push({ text: $(this).text(), href: $(this).attr('href'), fullText: fullText });
            }
        });

        if (results.length > 0) {
            // ایجاد دکمه "مشاهده نتیجه جست و جو"
            const $viewResultsBtn = $("<button>")
                .addClass("view-results-button")
                .text('مشاهده نتیجه جست و جو'); // عدد از روی دکمه حذف شده است

            $viewResultsBtn.data('results', results);
            $mainSearchDropdown.append($viewResultsBtn);
        } else {
            $mainSearchDropdown.append(createEmptyStateHTML("نتیجه‌ای یافت نشد."));
        }
    }

    // --- توابع مدیریت تاریخچه، علاقه‌مندی‌ها و آیتم فعال ---

    /**
     * یک آیتم را به لیست تاریخچه بازدیدها اضافه می‌کند.
     * @param {string} text - متن آیتم
     * @param {string} href - لینک آیتم
     */
    function addToHistory(text, href) {
        historyItems = historyItems.filter(item => item.href !== href);
        historyItems.unshift({ text, href });
        if (historyItems.length > 10) historyItems.pop();
        localStorage.setItem('historyItems', JSON.stringify(historyItems));
        updateHistoryDropdown();
    }

    /**
     * دراپ‌دان تاریخچه را بر اساس محتوای فعلی و عبارت جستجو شده در آن، به‌روز می‌کند.
     */
   function updateHistoryDropdown() {
    const $historyContent = $("#history-content");
    const searchTerm = $("#history-search-input").val().trim().toLowerCase();
    $historyContent.empty();

    // ۱. فیلتر کردن آیتم‌های تاریخچه بر اساس جستجو
    const filteredItems = historyItems.filter(item => item.text.toLowerCase().includes(searchTerm));

    if (historyItems.length === 0) {
        $historyContent.html(createEmptyStateHTML("تاریخچه‌ای وجود ندارد."));
        return; // از ادامه تابع خارج شو
    }
    
    if (filteredItems.length === 0) {
        $historyContent.html(createEmptyStateHTML("نتیجه‌ای یافت نشد."));
        return; // از ادامه تابع خارج شو
    }
    
    // ۲. ساختن و اضافه کردن آیتم‌ها به لیست
    $.each(filteredItems, function(index, item) {
        let linkContent = item.text;

        // اگر جستجو فعال نیست، متن‌های طولانی را کوتاه کن
        if (!searchTerm && item.text.length > 30) {
            linkContent = item.text.substring(0, 30) + "...";
        } else if (searchTerm) {
            // اگر جستجو فعال است، متن را هایلایت کن
            linkContent = highlightText(item.text, searchTerm);
        }

        const $link = $("<a>").attr("href", item.href).addClass("history-item").html(linkContent);

        // اگر متن کوتاه شده است، اتریبیوت دیتا برای تولتیپ را اضافه کن
        if (!searchTerm && item.text.length > 30) {
            $link.attr('data-tooltip-text', item.text);
        }

        $link.on("click", function(e) {
            e.preventDefault();
            setActiveItem(item.text, item.href);
            closeAllNonPinnedDropdowns();
        });

        $historyContent.append($link);
    });

    // ۳. **نکته کلیدی**: فعال‌سازی مجدد تولتیپ روی آیتم‌های جدید
    // این کد تضمین می‌کند که تولتیپ همیشه روی آیتم‌های خلاصه‌شده کار کند.
    $("#historyDropdown").tooltip({
        items: "a[data-tooltip-text]", // فقط برای لینک‌هایی که این اتریبیوت را دارند
        classes: {
            "ui-tooltip": "ui-tooltip-custom tooltip--history"
        },
        position: {
            my: "center top",
            at: "center bottom+5"
        },
        content: function() {
            return $(this).attr('data-tooltip-text');
        }
    });
}
    /**
     * یک آیتم را به عنوان آیتم فعال در هدر تنظیم می‌کند.
     * @param {string} text - متن کامل آیتم
     * @param {string} href - لینک آیتم
     */
    function setActiveItem(text, href) {
        const fullText = text;
        updateActiveItemDisplay(fullText, href);
        $activeItemContainer.data({ text: fullText, href });
        const isFavorited = favoriteItems.has(JSON.stringify([fullText, href]));
        $activeItemStar.toggleClass("favorited fas", isFavorited).toggleClass("far", !isFavorited);
    }

    /**
     * وضعیت علاقه‌مندی یک آیتم را تغییر می‌دهد (اضافه یا حذف می‌کند).
     * @param {string} text - متن کامل آیتم
     * @param {string} href - لینک آیتم
     */
    function toggleFavorite(text, href) {
        const itemString = JSON.stringify([text, href]);

        if (favoriteItems.has(itemString)) {
            favoriteItems.delete(itemString);
        } else {
            favoriteItems.add(itemString);
        }
        localStorage.setItem('favoriteItems', JSON.stringify(Array.from(favoriteItems)));

        const isFavorited = favoriteItems.has(itemString);

        // به‌روزرسانی ستاره‌ها در منوی اصلی "همه"
        $("#sidebarDropdown .sidebar-item-wrapper").each(function() {
            const $link = $(this).find("a");
            const linkFullText = $link.attr('data-full-text') || $link.text().trim();
            if (linkFullText === text && $link.attr("href") === href) {
                $(this).find(".favorite-star").toggleClass("favorited fas", isFavorited).toggleClass("far", !isFavorited);
            }
        });

        // به‌روزرسانی ستاره آیتم فعال در هدر
        if ($activeItemContainer.data("text") === text) {
            $activeItemStar.toggleClass("favorited fas", isFavorited).toggleClass("far", !isFavorited);
        }
        // به‌روزرسانی دراپ‌دان علاقه‌مندی‌ها
        updateFavoritesDropdown();
    }

    /**
     * دراپ‌دان علاقه‌مندی‌ها را بر اساس محتوای فعلی و عبارت جستجو شده در آن، به‌روز می‌کند.
     */
    function updateFavoritesDropdown() {
        const $favoritesContent = $("#favorites-content");
        const searchTerm = $("#favorites-search-input").val().trim();
        $favoritesContent.empty();

        if (favoriteItems.size === 0) {
            $favoritesContent.html(createEmptyStateHTML("هیچ موردی در علاقه‌مندی‌ها وجود ندارد."));
            return;
        }

        const filteredItems = Array.from(favoriteItems)
            .map(itemString => JSON.parse(itemString))
            .filter(([text, href]) => text.toLowerCase().includes(searchTerm.toLowerCase()));

        if (filteredItems.length === 0) {
            $favoritesContent.html(createEmptyStateHTML("نتیجه‌ای یافت نشد."));
        } else {
            $.each(filteredItems, function(index, [text, href]) {
                const $itemDiv = $("<div>").addClass("favorite-item");
                let linkContent = text;
                if (searchTerm) {
                    linkContent = highlightText(text, searchTerm);
                } else if (text.length > 30) {
                    linkContent = text.substring(0, 30) + "...";
                }
                const $link = $("<a>").attr("href", href).html(linkContent).on("click", function(e) {
                    e.preventDefault();
                    setActiveItem(text, href);
                    addToHistory(text, href);
                    closeAllNonPinnedDropdowns();
                });

                if (!searchTerm && text.length > 30) {
                    $link.attr('data-tooltip-text', text);
                }

                const $removeIcon = $("<i>").addClass("fas fa-times remove-favorite-icon").on("click", (e) => {
                    e.stopPropagation();
                    toggleFavorite(text, href);
                });
                $itemDiv.append($link, $removeIcon);
                $favoritesContent.append($itemDiv);
            });
        }
    }

    // --- توابع هایلایت کردن و فیلتر کردن ---

    /**
     * کاراکترهای خاص را برای استفاده در عبارت منظم (RegExp) آماده می‌کند.
     */
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * متن جستجو شده را در متن کامل پیدا کرده و با تگ span هایلایت می‌کند.
     */
    function highlightText(fullText, searchTerm) {
        if (!searchTerm) {
            return fullText;
        }
        const regex = new RegExp(escapeRegExp(searchTerm), 'gi');
        return fullText.replace(regex, `<span class="highlight">$&</span>`);
    }

    /**
     * آیتم‌های منوی "همه" را بر اساس عبارت جستجو شده فیلتر (نمایش/مخفی) می‌کند.
     */
    function filterSidebar(searchTerm) {
        const term = searchTerm.toLowerCase();
        $(".sidebar-dropdown .accordion-group").each(function() {
            const $group = $(this);
            let groupHasVisibleItems = false;
            $group.find(".sidebar-item-wrapper").each(function() {
                const $wrapper = $(this);
                const $link = $wrapper.find("a");
                const fullText = $link.attr('data-full-text') || $link.text();
                const isMatch = term ? fullText.toLowerCase().includes(term) : true;
                if (isMatch) {
                    if (term) {
                        $link.html(highlightText(fullText, term));
                    } else {
                        if (fullText.length > 30) {
                            $link.text(fullText.substring(0, 30) + "...");
                        } else {
                            $link.text(fullText);
                        }
                    }
                    $wrapper.show();
                    groupHasVisibleItems = true;
                } else {
                    $wrapper.hide();
                }
            });
            $group.toggle(groupHasVisibleItems);
        });
    }

    // --- توابع راه‌اندازی اولیه ---

    /**
     * گزینه‌های دسته‌بندی جستجو را آماده‌سازی می‌کند.
     */
    function initializeSearchOptions() {
        const $searchOptions = $("#searchOptionsDropdown a");
        $searchOptions.each(function() {
            $(this).prepend($("<i>").addClass("fas fa-check search-option-check"));
        });
        $searchOptions.on("click", function(e) {
            e.preventDefault();
            $searchOptions.removeClass("selected");
            $(this).addClass("selected");
            closeAllNonPinnedDropdowns();
        });
    }

    /**
     * آیکون 'x' (پاک کردن) را برای اینپوت‌های جستجو تنظیم می‌کند.
     */
    function setupClearIcon(searchContainerSelector) {
        const $searchContainer = $(searchContainerSelector);
        const $input = $searchContainer.find("input");
        const $clearIcon = $searchContainer.find(".clear-icon");
        if (!$input.length || !$clearIcon.length) return;
        $input.on("input", () => $clearIcon.toggle(!!$input.val()));
        $clearIcon.on("mousedown", (e) => {
            e.preventDefault();
            $input.val("").trigger("input").focus();
        });
    }

    /**
     * نمایش متن آیتم فعال در هدر را مدیریت می‌کند (کوتاه کردن در صورت نیاز).
     */
    function updateActiveItemDisplay(fullText, href) {
        const $activeItemText = $("#active-item-text");
        const maxLen = 25;
        if (fullText.length > maxLen) {
            const truncatedText = fullText.substring(0, maxLen) + "...";
            $activeItemText.text(truncatedText);
            $activeItemText.attr('data-full-text', fullText);
        } else {
            $activeItemText.text(fullText);
            $activeItemText.removeAttr('data-full-text');
        }
    }

    /**
     * تابع اصلی راه‌اندازی برنامه 🚀
     * تمام رویدادهای اولیه و ساختارها را تنظیم می‌کند.
     */
    function initializeApp() {
        // ۱. رویداد کلیک برای باز و بسته شدن زیرمنوها (آکاردئون)
        $(".sidebar-dropdown .accordion-group .accordion-header").on("click", function() {
            $(this).toggleClass("active").next(".accordion-body").toggle("blind", { direction: "vertical" }, 100);
        });

        // ۲. ساخت آیتم‌های منوی "همه" و اضافه کردن ستاره به آن‌ها
        $(".sidebar-dropdown .accordion-body a").not('.sidebar-item-wrapper a').each(function() {
            const $link = $(this);
            const text = $link.text().trim();
            const href = $link.attr("href");
            const $wrapper = $("<div>").addClass("sidebar-item-wrapper");
            const $starIcon = $("<i>").addClass("far fa-star favorite-star");
            if (favoriteItems.has(JSON.stringify([text, href]))) {
                $starIcon.addClass('fas favorited').removeClass('far');
            }
            $starIcon.on("click", (e) => {
                e.stopPropagation();
                e.preventDefault();
                toggleFavorite(text, href);
            });
            $link.on("click", (e) => {
                e.preventDefault();
                setActiveItem(text, href);
                addToHistory(text, href);
                if (!$("#sidebarDropdown").hasClass("pinned")) {
                    closeAllNonPinnedDropdowns();
                }
            });
            $link.wrap($wrapper).parent().append($starIcon);
        });

        // ۳. کوتاه کردن متن‌های طولانی
        truncateAndTooltipify("#sidebarDropdown .sidebar-item-wrapper a");

        // ۴. اتصال سایر رویدادهای برنامه
        $activeItemStar.on("click", () => {
            const { text, href } = $activeItemContainer.data();
            if (text && href) toggleFavorite(text, href);
        });
        $("#sidebar-search-input").on("input", e => filterSidebar($(e.target).val().trim()));
        $("#favorites-search-input").on("input", updateFavoritesDropdown);
        $("#history-search-input").on("input", function() {
            updateHistoryDropdown();
        });

        // ۵. به‌روزرسانی اولیه دراپ‌دان‌ها و تنظیمات
        updateFavoritesDropdown();
        updateHistoryDropdown();
        initializeSearchOptions();
        setupClearIcon(".search-box-wrapper");
        setupClearIcon("#sidebarDropdown");
        setupClearIcon("#favoritesDropdown");
        setupClearIcon("#historyDropdown");
    }

    // --- اجرای برنامه و اتصال رویدادهای اصلی ---

    // برنامه را راه‌اندازی کن
    initializeApp();

    /**
     * یک دراپ‌دان مشخص را باز یا بسته می‌کند.
     */
    function toggleDropdown($dropdown, $wrapper = null) {
        if ($wrapper && $dropdown.hasClass("pinned")) {
            return;
        }
        const isCurrentlyOpen = $dropdown.hasClass("show");
        closeAllNonPinnedDropdowns();
        if (isCurrentlyOpen) {
            if ($wrapper) {
                $wrapper.removeClass("wrapper--active");
            }
        } else {
            $dropdown.stop(true, true).show("blind", { direction: "vertical" }, 100).addClass("show");
            if ($wrapper) {
                $wrapper.addClass("wrapper--active");
            }
        }
    }

    // --- رویدادهای مربوط به جستجوی اصلی ---
    $mainSearchInput.on('focus', function() {
        closeAllNonPinnedDropdowns('mainSearchDropdown');
        const term = $(this).val().trim();
        if (!term) {
            displayMainSearchHistory();
        } else {
            executeMainSearch(term);
        }
    });

    $mainSearchInput.on('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const term = $(this).val().trim();
            if (term) executeMainSearch(term);
        }
    });

    // رویداد برای زمانی که کاربر در اینپوت اصلی تایپ یا آن را پاک می‌کند
    $mainSearchInput.on('input', function() {
        const term = $(this).val().trim();
        if (term) {
            executeMainSearch(term);
        } else {
            displayMainSearchHistory();
        }
    });

    $mainSearchInput.on('blur', function() {
        setTimeout(function() {
            if (!$mainSearchDropdown.is(':hover')) {
                $mainSearchDropdown.hide("blind", { direction: "vertical" }, 100).removeClass("show");
            }
        }, 150);
    });

    // مدیریت رویدادهای کلیک داخل دراپ‌دان جستجوی اصلی
    $mainSearchDropdown.on('mousedown', function(e) {
        const $target = $(e.target);
        if ($target.hasClass('view-results-button') || $target.hasClass('remove-history-icon')) {
            e.preventDefault();
        }
        if ($target.hasClass('view-results-button')) {
            // عملکرد این دکمه عمداً غیرفعال شده است
            console.log("دکمه 'مشاهده نتیجه' کلیک شد اما غیرفعال است.");
            return;
        } else if ($target.hasClass('remove-history-icon')) {
            e.stopPropagation();
            const termToRemove = $target.data('term');
            mainSearchHistory = mainSearchHistory.filter(item => item.term !== termToRemove);
            localStorage.setItem('mainSearchHistory', JSON.stringify(mainSearchHistory));
            displayMainSearchHistory();
        } else if ($target.hasClass('history-search-item')) {
            e.preventDefault();
            const clickedTerm = $target.clone().children().remove().end().text();
            const historyItem = mainSearchHistory.find(item => item.term === clickedTerm);
            if (historyItem) {
                $mainSearchInput.val(historyItem.term).focus();
                $("#searchOptionsDropdown a").removeClass("selected");
                $("#searchOptionsDropdown a").filter(function() {
                    return $(this).text().trim() === historyItem.category;
                }).addClass("selected");
                executeMainSearch(historyItem.term);
            }
        } else if ($target.hasClass('result-item')) {
            e.preventDefault();
            const fullText = $target.attr('data-full-text') || $target.text();
            setActiveItem(fullText, $target.attr('href'));
            addToHistory(fullText, $target.attr('href'));
            closeAllNonPinnedDropdowns();
        }
    });

    // --- رویدادهای کلیک برای باز کردن دراپ‌دان‌ها ---
    $('#all-menu-wrapper').on('click', (e) => { if (!$(e.target).closest('#sidebarDropdown').length) toggleDropdown($("#sidebarDropdown"), $("#all-menu-wrapper")); });
    $('#favorites-menu-wrapper').on('click', (e) => {
        if (!$(e.target).closest('#favoritesDropdown').length) {
            updateFavoritesDropdown();
            toggleDropdown($("#favoritesDropdown"), $("#favorites-menu-wrapper"));
        }
    });
    $('#history-menu-wrapper').on('click', (e) => {
        if (!$(e.target).closest('#historyDropdown').length) {
            updateHistoryDropdown();
            toggleDropdown($("#historyDropdown"), $("#history-menu-wrapper"));
        }
    });
    $('.search-category-button').on('click', (e) => { e.stopPropagation(); toggleDropdown($("#searchOptionsDropdown")); });
    $('#notification-wrapper .icon').on('click', (e) => { e.stopPropagation(); toggleDropdown($("#notificationDropdown")); });
    $('.avatar').on('click', (e) => { e.stopPropagation(); toggleDropdown($("#profileDropdown")); });

    // --- رویداد مربوط به پین کردن دراپ‌دان‌ها ---
    $(".dropdown-pin-icon").on("click", function(event) {
        event.stopPropagation();
        const $dropdown = $(this).closest(".sidebar-dropdown, .history-dropdown, .favorites-dropdown");
        if (!$dropdown.length) return;
        const dropdownId = $dropdown.attr("id");
        const isCurrentlyPinned = $dropdown.hasClass("pinned");
        const $menuItemWrapper = $dropdown.closest('.menu-item-wrapper');
        if (isCurrentlyPinned) {
            $dropdown.removeClass("pinned");
            $(this).removeClass("pinned-active");
            $("body").removeClass("body-pinned");
            $menuItemWrapper.addClass('wrapper--active');
        } else {
            const $previousPinned = $(".pinned");
            if ($previousPinned.length) {
                $previousPinned.hide().removeClass('show');
                $previousPinned.closest('.menu-item-wrapper').removeClass('wrapper--active');
            }
            $(".sidebar-dropdown, .history-dropdown, .favorites-dropdown").removeClass("pinned");
            $(".dropdown-pin-icon").removeClass("pinned-active");
            $dropdown.addClass("pinned");
            $(this).addClass("pinned-active");
            $("body").addClass("body-pinned");
            $menuItemWrapper.removeClass('wrapper--active');
            if (!$dropdown.hasClass("show")) {
                $dropdown.stop(true, true).show().addClass("show");
            }
        }
        $('.menu-item-wrapper').not($menuItemWrapper).removeClass('wrapper--active');
    });

    // --- رویداد کلیک روی صفحه برای بستن دراپ‌دان‌ها ---
    $(window).on("click", (event) => {
        if (!$(event.target).closest(".menu-item-wrapper, .search-box-wrapper, .icon-wrapper, .avatar, .dropdown-pin-icon, .main-search-dropdown, .sidebar-dropdown, .history-dropdown, .favorites-dropdown, .notification-dropdown, .profile-dropdown, .search-options-dropdown").length) {
            closeAllNonPinnedDropdowns();
        }
    });

    // --- تنظیمات پلاگین تولتیپ jQuery UI ---

    // تنظیم تولتیپ برای دراپ‌دان‌های سایدبار، علاقه‌مندی‌ها و تاریخچه
    $("#sidebarDropdown, #favoritesDropdown, #historyDropdown").tooltip({
        items: "a[data-tooltip-text]", // فقط برای لینک‌هایی که این اتریبیوت را دارند
        classes: { "ui-tooltip": "ui-tooltip-custom" },
        show: { delay: 400 },
        position: { my: "center top", at: "center bottom+5" },
        open: function(event, ui) {
            const triggerId = $(this).attr('id');
            ui.tooltip.removeClass('tooltip--sidebar tooltip--favorites tooltip--history');
            if (triggerId === 'sidebarDropdown') {
                ui.tooltip.addClass('tooltip--sidebar');
            } else if (triggerId === 'favoritesDropdown') {
                ui.tooltip.addClass('tooltip--favorites');
            } else if (triggerId === 'historyDropdown') {
                ui.tooltip.addClass('tooltip--history');
            }
        },
        content: function() {
            return $(this).attr('data-tooltip-text'); // محتوا از اتریبیوت سفارشی خوانده می‌شود
        }
    });

    // تنظیم تولتیپ برای آیتم فعال در هدر
    $("#active-item-text").tooltip({
        items: "[data-full-text]",
        classes: { "ui-tooltip": "ui-tooltip-custom tooltip--active-item" },
        position: { my: "center top", at: "center bottom+8" },
        content: function() {
            return $(this).attr('data-full-text');
        }
    });

    // تنظیم تولتیپ برای دراپ‌دان جستجوی اصلی
    $("#mainSearchDropdown").tooltip({
        items: "a[title]",
        classes: { "ui-tooltip": "ui-tooltip-custom tooltip-search-input" },
        show: { delay: 400 },
        position: { my: "center top", at: "center+0 bottom+5" },
        content: function() {
            return $(this).attr('title'); // محتوا از اتریبیوت title خوانده می‌شود
        }
    });
});