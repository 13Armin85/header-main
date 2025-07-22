$(document).ready(function() {
    const initialFavorites = JSON.parse(localStorage.getItem('favoriteItems')) || [];
    const favoriteItems = new Set(initialFavorites);
    let historyItems = JSON.parse(localStorage.getItem('historyItems')) || [];
    let mainSearchHistory = JSON.parse(localStorage.getItem('mainSearchHistory')) || [];
    const $activeItemContainer = $("#active-item-container");
    const $activeItemText = $("#active-item-text");
    const $activeItemStar = $("#active-item-star");
    const $mainSearchInput = $(".search-input");
    const $mainSearchDropdown = $("#mainSearchDropdown");

    /**
     * منو را از فایل data.json بارگذاری می‌کند.
     * برای بار اول از فایل می‌خواند و در localStorage ذخیره می‌کند (کش می‌کند).
     * برای بارهای بعدی، مستقیماً از localStorage می‌خواند تا سرعت افزایش یابد.
     * @returns {Promise<Object>} آبجکت داده‌های منو
     */
    async function loadMenuData() {
        const cachedMenu = localStorage.getItem('serviaMenuData');
        if (cachedMenu) {
            console.log("Loading menu from Cache (localStorage)...");
            return JSON.parse(cachedMenu);
        } else {
            console.log("Loading menu from data.json for the first time...");
            try {
                const response = await fetch('data.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                localStorage.setItem('serviaMenuData', JSON.stringify(data));
                return data;
            } catch (error) {
                console.error("Could not fetch or parse menu data:", error);
                return { menu: [] };
            }
        }
    }

    /**
     * به صورت بازگشتی (Recursive) منو را از روی داده‌های JSON می‌سازد و به صفحه اضافه می‌کند.
     * این تابع ساختار آکاردئونی تو در تو را به درستی ایجاد می‌کند.
     * @param {Array} items - آرایه‌ای از آیتم‌های منو (یا زیرمنو)
     * @param {jQuery} parentElement - عنصری که آیتم‌های جدید باید به آن اضافه شوند
     */
    function renderMenu(items, parentElement) {
        $.each(items, function(i, item) {
            if (item.sub_menu && item.sub_menu.length > 0) {
                const $accordionGroup = $('<div>').addClass('accordion-group');
                const $accordionHeader = $('<div>').addClass('accordion-header').text(item.title);
                const $accordionBody = $('<div>').addClass('accordion-body');

                renderMenu(item.sub_menu, $accordionBody);

                if ($accordionBody.children().length > 0) {
                    $accordionGroup.append($accordionHeader).append($accordionBody);
                    parentElement.append($accordionGroup);
                }
            } else {
                const $link = $('<a>')
                    .attr('href', `#/${item.id}`)
                    .attr('data-id', item.id)
                    .text(item.title);
                parentElement.append($link);
            }
        });
    }
    
    /**
     * متن‌های طولانی را کوتاه کرده و برای آن‌ها تولتیپ ایجاد می‌کند.
     * @param {string} selector - سلکتور jQuery برای انتخاب عناصر
     * @param {number} limit - حداکثر طول مجاز متن قبل از کوتاه شدن
     */
    function truncateAndTooltipify(selector, limit) {
        $(selector).each(function() {
            const $link = $(this);
            const fullText = $link.attr('data-full-text') || $link.text().trim();

            if (fullText.length > limit) {
                const truncatedText = fullText.substring(0, limit) + "...";
                $link.text(truncatedText);
                $link.attr('data-tooltip-text', fullText);
                $link.removeAttr('title');
            }

            if (!$link.attr('data-full-text')) {
                $link.attr('data-full-text', fullText);
            }
        });
    }


    function closeAllNonPinnedDropdowns(excludeId = null) {
        $(".sidebar-dropdown, .history-dropdown, .favorites-dropdown, .notification-dropdown, .profile-dropdown, .search-options-dropdown, .main-search-dropdown").each(function() {
            const $dropdown = $(this);
            if ($dropdown.hasClass("show") && $dropdown.attr("id") !== excludeId && !$dropdown.hasClass("pinned")) {
                $dropdown.hide("blind", {
                    direction: "vertical"
                }, 100).removeClass("show");
            }
        });
        $('.menu-item-wrapper').removeClass('wrapper--active');
    }

    function createEmptyStateHTML(message) {
        return `
            <div class="empty-state-container">
                <img src="images/no-data-sm 1.svg" alt="یافت نشد" />
                <p>${message}</p>
            </div>
        `;
    }

    // --- توابع مدیریت جستجوی اصلی ---

    function updateMainSearchHistory(term, category) {
        if (!term || !category) return;
        mainSearchHistory = mainSearchHistory.filter(item => item.term !== term);
        mainSearchHistory.unshift({
            term: term,
            category: category
        });
        if (mainSearchHistory.length > 5) mainSearchHistory.pop();
        localStorage.setItem('mainSearchHistory', JSON.stringify(mainSearchHistory));
    }


    function displayMainSearchHistory() {
        $mainSearchDropdown.empty().show("blind", {
            direction: "vertical"
        }, 100).addClass('show');
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
     * جستجوی اصلی را انجام می‌دهد.
     * @param {string} term - عبارت مورد جستجو
     * @param {boolean} saveToHistory - آیا نتیجه در تاریخچه ذخیره شود یا خیر
     */
    function executeMainSearch(term, saveToHistory = false) {
        if (!term) return;

        if (saveToHistory) {
            const selectedCategory = $("#searchOptionsDropdown a.selected").text().trim();
            updateMainSearchHistory(term, selectedCategory);
        }

        $mainSearchDropdown.empty().show().addClass('show');
        const results = [];
        $("#sidebarDropdown .sidebar-item-wrapper a").each(function() {
            const fullText = $(this).attr('data-full-text') || $(this).text();
            if (fullText.toLowerCase().includes(term.toLowerCase())) {
                results.push({
                    text: $(this).text(),
                    href: $(this).attr('href'),
                    fullText: fullText
                });
            }
        });

        if (results.length > 0) {
            const $viewResultsBtn = $("<button>")
                .addClass("view-results-button")
                .text('مشاهده نتیجه جست و جو');

            $viewResultsBtn.data('results', results);
            $mainSearchDropdown.append($viewResultsBtn);
        } else {
            $mainSearchDropdown.append(createEmptyStateHTML("نتیجه‌ای یافت نشد."));
        }
    }

    function addToHistory(text, href) {
        historyItems = historyItems.filter(item => item.href !== href);
        historyItems.unshift({
            text,
            href
        });
        if (historyItems.length > 10) historyItems.pop();
        localStorage.setItem('historyItems', JSON.stringify(historyItems));
        updateHistoryDropdown();
    }

    function updateHistoryDropdown() {
        const $historyContent = $("#history-content");
        const searchTerm = $("#history-search-input").val().trim().toLowerCase();
        $historyContent.empty();

        const filteredItems = historyItems.filter(item => item.text.toLowerCase().includes(searchTerm));

        if (historyItems.length === 0) {
            $historyContent.html(createEmptyStateHTML("تاریخچه‌ای وجود ندارد."));
            return;
        }

        if (filteredItems.length === 0) {
            $historyContent.html(createEmptyStateHTML("نتیجه‌ای یافت نشد."));
            return;
        }

        $.each(filteredItems, function(index, item) {
            let linkContent = item.text;

            if (!searchTerm && item.text.length > 30) {
                linkContent = item.text.substring(0, 30) + "...";
            } else if (searchTerm) {
                linkContent = highlightText(item.text, searchTerm);
            }

            const $link = $("<a>").attr("href", item.href).addClass("history-item").html(linkContent);

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

        $("#historyDropdown").tooltip({
            items: "a[data-tooltip-text]",
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

    function setActiveItem(text, href) {
        const fullText = text;
        updateActiveItemDisplay(fullText, href);
        $activeItemContainer.data({
            text: fullText,
            href
        });
        const isFavorited = favoriteItems.has(JSON.stringify([fullText, href]));
        $activeItemStar.toggleClass("favorited fas", isFavorited).toggleClass("far", !isFavorited);
    }

    function toggleFavorite(text, href) {
        const itemString = JSON.stringify([text, href]);

        if (favoriteItems.has(itemString)) {
            favoriteItems.delete(itemString);
        } else {
            favoriteItems.add(itemString);
        }
        localStorage.setItem('favoriteItems', JSON.stringify(Array.from(favoriteItems)));

        const isFavorited = favoriteItems.has(itemString);

        $("#sidebarDropdown .sidebar-item-wrapper").each(function() {
            const $link = $(this).find("a");
            const linkFullText = $link.attr('data-full-text') || $link.text().trim();
            if (linkFullText === text && $link.attr("href") === href) {
                $(this).find(".favorite-star").toggleClass("favorited fas", isFavorited).toggleClass("far", !isFavorited);
            }
        });

        if ($activeItemContainer.data("text") === text) {
            $activeItemStar.toggleClass("favorited fas", isFavorited).toggleClass("far", !isFavorited);
        }
        updateFavoritesDropdown();
    }


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



    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function highlightText(fullText, searchTerm) {
        if (!searchTerm) {
            return fullText;
        }
        const regex = new RegExp(escapeRegExp(searchTerm), 'gi');
        return fullText.replace(regex, `<span class="highlight">$&</span>`);
    }
    /**
     * کلیک روی تب‌های داخل دراپ‌دان نوتیفیکیشن را مدیریت می‌کند.
     */
    function handleNotificationTabClick() {
        const $tabs = $(".notification-tabs button");
        const $content = $(".notification-dropdown-content");

        $tabs.on("click", function() {
            const $this = $(this);
            $tabs.removeClass("active");
            $this.addClass("active");

            // حذف پیام خالی احتمالی قبلی
            $content.find('.empty-state-container').remove();

            if ($this.text() === "خوانده‌نشده") {
                const $unreadItems = $content.find("a .notification-item.unread");
                // همه آیتم‌ها را مخفی کن
                $content.find("a").hide();

                if ($unreadItems.length === 0) {
                    // اگر آیتم خوانده‌نشده‌ای نبود، پیام را نمایش بده
                    const emptyHTML = createEmptyStateHTML("هیچ پیام خوانده نشده ای ندارید.");
                    $content.append(emptyHTML);
                } else {
                    // در غیر این صورت، آیتم‌های خوانده‌نشده را نمایش بده
                    $unreadItems.parent("a").show();
                }
            } else { // اگر روی تب "همه" کلیک شد
                // همه آیتم‌ها را نمایش بده
                $content.find("a").show();
            }
        });
    }
    /**
 * تمام رویدادهای مربوط به سیستم نوتیفیکیشن را فعال می‌کند.
 */
function initializeNotificationSystem() {
    const $tabs = $(".notification-tabs button");
    const $content = $(".notification-dropdown-content");
    const $markAllAsReadLink = $(".notification-dropdown-header a");

    // رویداد کلیک برای تب‌های "همه" و "خوانده‌نشده"
    $tabs.on("click", function() {
        const $this = $(this);
        $tabs.removeClass("active");
        $this.addClass("active");

        $content.find('.empty-state-container').remove();

        if ($this.text() === "خوانده‌نشده") {
            const $unreadItems = $content.find("a .notification-item.unread");
            $content.find("a").hide();

            if ($unreadItems.length === 0) {
                const emptyHTML = createEmptyStateHTML("هیچ پیام خوانده نشده ای ندارید.");
                $content.append(emptyHTML);
            } else {
                $unreadItems.parent("a").show();
            }
        } else {
            $content.find("a").show();
        }
    });

    // رویداد کلیک برای "علامت‌گذاری همه به عنوان خوانده شده"
    $markAllAsReadLink.on("click", function(e) {
        e.preventDefault(); // جلوگیری از رفرش صفحه

        // حذف کلاس unread از همه آیتم‌ها
        $content.find(".notification-item.unread").removeClass("unread");

        // شبیه‌سازی کلیک روی تب فعال برای رفرش کردن ویو
        // این کار باعث می‌شود اگر کاربر در تب "خوانده‌نشده" باشد، پیام خالی نمایش داده شود
        $('.notification-tabs button.active').trigger('click');
    });
}

    function filterSidebar(searchTerm) {
        const term = searchTerm.toLowerCase();
        $(".sidebar-dropdown .accordion-group").each(function() {
            const $group = $(this);
            let groupHasVisibleItems = false;
            // هایلایت کردن هدرهای اصلی
            const headerText = $group.find('.accordion-header').first().text();
            if (term) {
                $group.find('.accordion-header').first().html(highlightText(headerText, term));
            } else {
                $group.find('.accordion-header').first().text(headerText);
            }

            $group.find(".sidebar-item-wrapper").each(function() {
                const $wrapper = $(this);
                const $link = $wrapper.find("a");
                const fullText = $link.attr('data-full-text') || $link.text();
                const isMatch = term ? fullText.toLowerCase().includes(term) : true;
                if (isMatch) {
                    if (term) {
                        $link.html(highlightText(fullText, term));
                    } else {
                        truncateAndTooltipify($link, 28);
                    }
                    $wrapper.show();
                    groupHasVisibleItems = true;
                } else {
                    $wrapper.hide();
                }
            });

            if (term && headerText.toLowerCase().includes(term)) {
                groupHasVisibleItems = true;
            }
            $group.toggle(groupHasVisibleItems);
        });
    }


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

    function initializeApp() {
        // ۱. رویداد کلیک برای باز و بسته شدن زیرمنوها (آکاردئون)
        $(".sidebar-dropdown .accordion-group .accordion-header").on("click", function() {
            // جلوگیری از باز و بسته شدن هنگام فیلتر کردن
            if ($("#sidebar-search-input").val().trim() !== "") return;
            $(this).toggleClass("active").next(".accordion-body").toggle("blind", {
                direction: "vertical"
            }, 100);
        });
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

        // ۳. کوتاه کردن متن‌های طولانی فقط برای منوی "همه" با حد 28 کاراکتر
        truncateAndTooltipify("#sidebarDropdown .sidebar-item-wrapper a", 28);

        // ۴. اتصال سایر رویدادهای برنامه
        $activeItemStar.on("click", () => {
            const {
                text,
                href
            } = $activeItemContainer.data();
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

        // ۶. تنظیمات پلاگین تولتیپ jQuery UI
        $("#sidebarDropdown, #favoritesDropdown, #historyDropdown").tooltip({
            items: "a[data-tooltip-text]",
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
                return $(this).attr('data-tooltip-text');
            }
        });

        $("#active-item-text").tooltip({
            items: "[data-full-text]",
            classes: { "ui-tooltip": "ui-tooltip-custom tooltip--active-item" },
            position: { my: "center top", at: "center bottom+8" },
            content: function() {
                return $(this).attr('data-full-text');
            }
        });

        $("#mainSearchDropdown").tooltip({
            items: "a[title]",
            classes: { "ui-tooltip": "ui-tooltip-custom tooltip-search-input" },
            show: { delay: 400 },
            position: { my: "center top", at: "center+0 bottom+5" },
            content: function() {
                return $(this).attr('title');
            }
        });
        handleNotificationTabClick(); 
        initializeNotificationSystem();
    }
    async function main() {
        const menuData = await loadMenuData();
        const $sidebarContainer = $("#sidebarDropdown");
        $sidebarContainer.find('.accordion-group').remove();
        renderMenu(menuData.menu, $sidebarContainer);

        initializeApp();
        
    }
    main();


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
            $dropdown.stop(true, true).show("blind", {
                direction: "vertical"
            }, 100).addClass("show");
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
            executeMainSearch(term, false);
        }
    });

    $mainSearchInput.on('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const term = $(this).val().trim();
            if (term) executeMainSearch(term, true);
        }
    });


    $mainSearchInput.on('input', function() {
        const term = $(this).val().trim();
        if (term) {
            executeMainSearch(term, false);
        } else {
            displayMainSearchHistory();
        }
    });

    $mainSearchInput.on('blur', function() {
        setTimeout(function() {
            if (!$mainSearchDropdown.is(':hover')) {
                $mainSearchDropdown.hide("blind", {
                    direction: "vertical"
                }, 100).removeClass("show");
            }
        }, 150);
    });

    $mainSearchDropdown.on('mousedown', function(e) {
        const $target = $(e.target);
        if ($target.hasClass('view-results-button') || $target.hasClass('remove-history-icon')) {
            e.preventDefault();
        }
        if ($target.hasClass('view-results-button')) {
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
                executeMainSearch(historyItem.term, true);
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
    $('#all-menu-wrapper').on('click', (e) => {
        if (!$(e.target).closest('#sidebarDropdown').length) toggleDropdown($("#sidebarDropdown"), $("#all-menu-wrapper"));
    });
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
    $('.search-category-button').on('click', (e) => {
        e.stopPropagation();
        toggleDropdown($("#searchOptionsDropdown"));
    });
    $('#notification-wrapper .icon').on('click', (e) => {
        e.stopPropagation();
        toggleDropdown($("#notificationDropdown"));
    });
    $('.avatar').on('click', (e) => {
        e.stopPropagation();
        toggleDropdown($("#profileDropdown"));
    });

    // --- رویداد مربوط به پین کردن دراپ‌دان‌ها ---
    $(".dropdown-pin-icon").on("click", function(event) {
        event.stopPropagation();
        const $dropdown = $(this).closest(".sidebar-dropdown, .history-dropdown, .favorites-dropdown");
        if (!$dropdown.length) return;
        const dropdownId = $dropdown.attr("id");
        const isCurrentlyPinned = $dropdown.hasClass("pinned");
        const $menuItemWrapper = $dropdown.closest('.menu-item-wrapper');
        if (isCurrentlyPinned) {
            closeAllNonPinnedDropdowns(dropdownId);
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
});