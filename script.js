$(document).ready(function() {
    // --- بخش متغیرهای اصلی ---
    const initialFavorites = JSON.parse(localStorage.getItem('favoriteItems')) || [];
    const favoriteItems = new Set(initialFavorites);
    let historyItems = JSON.parse(localStorage.getItem('historyItems')) || [];
    let mainSearchHistory = JSON.parse(localStorage.getItem('mainSearchHistory')) || [];

    const $activeItemContainer = $("#active-item-container");
    const $activeItemText = $("#active-item-text");
    const $activeItemStar = $("#active-item-star");
    const $mainSearchInput = $(".search-input");
    const $mainSearchDropdown = $("#mainSearchDropdown");

    // --- توابع اصلی برنامه ---

    // <--- مرحله ۱: ایجاد تابع کمکی برای کوتاه کردن متن و افزودن تولتیپ --->
   function truncateAndTooltipify(selector) {
    $(selector).each(function() {
        const $link = $(this);
        // متن کامل را از خود لینک می‌خوانیم
        const fullText = $link.text().trim();

        if (fullText.length > 50) {
            const truncatedText = fullText.substring(0, 30) + "...";
            $link.text(truncatedText);
            // متن کامل را در یک دیتا اتریبیوت سفارشی ذخیره می‌کنیم
            $link.attr('data-tooltip-text', fullText);
            // ویژگی title را به طور کامل حذف می‌کنیم تا تداخلی ایجاد نکند
            $link.removeAttr('title');
        }
    });
}

    function closeAllNonPinnedDropdowns(excludeId = null) {
        $(".sidebar-dropdown, .history-dropdown, .favorites-dropdown, .notification-dropdown, .profile-dropdown, .search-options-dropdown, .main-search-dropdown").each(function() {
            const $dropdown = $(this);
            if ($dropdown.hasClass("show") && $dropdown.attr("id") !== excludeId && !$dropdown.hasClass("pinned")) {
                $dropdown.hide("blind", { direction: "vertical" }, 100).removeClass("show");
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

   function updateMainSearchHistory(term, category) {
    if (!term || !category) return;
    mainSearchHistory = mainSearchHistory.filter(item => item.term !== term); 
    mainSearchHistory.unshift({ term: term, category: category }); 
    if (mainSearchHistory.length > 5) mainSearchHistory.pop();
    localStorage.setItem('mainSearchHistory', JSON.stringify(mainSearchHistory));
}

    function displayMainSearchHistory() {
    $mainSearchDropdown.empty().show("blind", { direction: "vertical" }, 100).addClass('show');
    if (mainSearchHistory.length > 0) {
        $mainSearchDropdown.append('<div class="search-history-header">جستجوهای اخیر</div>');
        $.each(mainSearchHistory, function(index, item) {
            const $historyLink = $("<a>").attr("href", "#")
                                        .addClass('history-search-item')
                                        .text(item.term)
                                        .attr('title', item.category); 
            const $removeIcon = $("<i>").addClass("fas fa-times remove-history-icon").data('term', item.term);
            $historyLink.append($removeIcon);
            $mainSearchDropdown.append($historyLink);
        });
    } else {
        $mainSearchDropdown.append(createEmptyStateHTML("تاریخچه جستجو خالی است."));
    }
}

    function executeMainSearch(term) {
    if (!term) return;
    const selectedCategory = $("#searchOptionsDropdown a.selected").text().trim();
    updateMainSearchHistory(term, selectedCategory); 
    $mainSearchDropdown.empty().show().addClass('show');
    const results = [];
    $("#sidebarDropdown .sidebar-item-wrapper a").each(function() {
        const fullText = $(this).attr('title') || $(this).text(); // برای جستجو از متن کامل استفاده کن
        if (fullText.toLowerCase().includes(term.toLowerCase())) {
            results.push({ text: $(this).text(), href: $(this).attr('href') });
        }
    });
    if (results.length > 0) {
        const $viewResultsBtn = $("<button>").addClass("view-results-button").text(`مشاهده نتیجه جست و جو (${results.length})`);
        $viewResultsBtn.data('results', results);
        $mainSearchDropdown.append($viewResultsBtn);
    } else {
        $mainSearchDropdown.append(createEmptyStateHTML("نتیجه‌ای یافت نشد."));
    }
}


    function addToHistory(text, href) {
        historyItems = historyItems.filter(item => item.href !== href);
        historyItems.unshift({ text, href });
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
        } else if (filteredItems.length === 0) {
            $historyContent.html(createEmptyStateHTML("نتیجه‌ای یافت نشد."));
        } else {
            $.each(filteredItems, function(index, item) {
                const $link = $("<a>").attr("href", item.href).addClass("history-item").text(item.text);
                $link.on("click", function(e) {
                    e.preventDefault();
                    setActiveItem(item.text, item.href);
                    closeAllNonPinnedDropdowns();
                });
                $historyContent.append($link);
            });
            // <--- مرحله ۲: فراخوانی تابع برای آیتم‌های تاریخچه --->
            truncateAndTooltipify("#history-content a");
        }
    }

    // این تابع را پیدا کرده و با کد زیر جایگزین کنید
function setActiveItem(text, href) {
    // text ورودی همیشه باید متن کامل باشد
    const fullText = text; 

    // فراخوانی تابع جدید برای نمایش متن در بیضی
    updateActiveItemDisplay(fullText, href);

    // ذخیره متن کامل و لینک در دیتا
    $activeItemContainer.data({ text: fullText, href });

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
        $(".sidebar-item-wrapper").each(function() {
            const $link = $(this).find("a");
            const linkText = $link.attr('title') || $link.text(); // از متن کامل برای مقایسه استفاده کن
            if (linkText === text && $link.attr("href") === href) {
                $(this).find(".favorite-star").toggleClass("favorited fas", isFavorited).toggleClass("far", !isFavorited);
            }
        });
        if (($activeItemContainer.data("text") === text) || ($activeItemContainer.data("text") === text.substring(0, 30) + "...")) {
            $activeItemStar.toggleClass("favorited fas", isFavorited).toggleClass("far", !isFavorited);
        }
        updateFavoritesDropdown();
    }

    function updateFavoritesDropdown() {
        const $favoritesContent = $("#favorites-content");
        const searchTerm = $("#favorites-search-input").val().trim().toLowerCase();
        $favoritesContent.empty();
        if (favoriteItems.size === 0) {
            $favoritesContent.html(createEmptyStateHTML("هیچ موردی در علاقه‌مندی‌ها وجود ندارد."));
            return;
        }
        const filteredItems = Array.from(favoriteItems).filter(itemString => JSON.parse(itemString)[0].toLowerCase().includes(searchTerm));
        if (filteredItems.length === 0) {
            $favoritesContent.html(createEmptyStateHTML("نتیجه‌ای یافت نشد."));
        } else {
            $.each(filteredItems, function(index, itemString) {
                const [text, href] = JSON.parse(itemString);
                const $itemDiv = $("<div>").addClass("favorite-item");
                const $link = $("<a>").attr("href", href).text(text).on("click", function(e) {
                    e.preventDefault();
                    setActiveItem(text, href);
                    addToHistory(text, href);
                    closeAllNonPinnedDropdowns();
                });
                const $removeIcon = $("<i>").addClass("fas fa-times remove-favorite-icon").on("click", (e) => {
                    e.stopPropagation();
                    toggleFavorite(text, href);
                });
                $itemDiv.append($link, $removeIcon);
                $favoritesContent.append($itemDiv);
            });
            // <--- مرحله ۲: فراخوانی تابع برای آیتم‌های علاقه‌مندی --->
            truncateAndTooltipify("#favorites-content a");
        }
    }

    function filterSidebar(searchTerm) {
        $(".sidebar-dropdown .accordion-group").each(function() {
            const $group = $(this);
            let groupHasVisibleItems = false;
            $group.find(".sidebar-item-wrapper").each(function() {
                const fullText = $(this).find('a').attr('title') || $(this).find('a').text(); // جستجو بر اساس متن کامل
                const isMatch = fullText.toLowerCase().includes(searchTerm);
                $(this).toggle(isMatch);
                if (isMatch) groupHasVisibleItems = true;
            });
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
    const maxLen = 25; // حداکثر طول متن در بیضی

    if (fullText.length > maxLen) {
        const truncatedText = fullText.substring(0, maxLen) + "...";
        $activeItemText.text(truncatedText);
        // اضافه کردن متن کامل به عنوان دیتا برای استفاده در تولتیپ
        $activeItemText.attr('data-full-text', fullText);
    } else {
        $activeItemText.text(fullText);
        $activeItemText.removeAttr('data-full-text');
    }
}

    function initializeApp() {
        $(".sidebar-dropdown .accordion-group .accordion-header").on("click", function() {
            $(this).toggleClass("active").next(".accordion-body").toggle("blind", { direction: "vertical" }, 100);
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
            $starIcon.on("click", (e) => { e.stopPropagation(); e.preventDefault(); toggleFavorite(text, href); });
            $link.on("click", (e) => {
                e.preventDefault();
                setActiveItem(text, href);
                addToHistory(text, href);
                if (!$("#sidebarDropdown").hasClass("pinned")) closeAllNonPinnedDropdowns();
            });
            $link.wrap($wrapper).parent().append($starIcon);
        });

        // <--- مرحله ۲: فراخوانی تابع برای آیتم‌های منوی "همه" --->
        truncateAndTooltipify("#sidebarDropdown .sidebar-item-wrapper a");

        $activeItemStar.on("click", () => {
            const { text, href } = $activeItemContainer.data();
            if (text && href) toggleFavorite(text, href);
        });

        $("#sidebar-search-input").on("input", e => filterSidebar($(e.target).val().trim().toLowerCase()));
        $("#favorites-search-input").on("input", updateFavoritesDropdown);
        $("#history-search-input").on("input", updateHistoryDropdown);

        updateFavoritesDropdown();
        updateHistoryDropdown();
        initializeSearchOptions(); 
        
        setupClearIcon(".search-box-wrapper");
        setupClearIcon("#sidebarDropdown");
        setupClearIcon("#favoritesDropdown");
        setupClearIcon("#historyDropdown");
    }

    initializeApp();
    
    // ... (بقیه کدها بدون تغییر باقی می‌مانند) ...
    function toggleDropdown($dropdown, $wrapper = null) {
        if ($wrapper && $dropdown.hasClass("pinned")) return;
        const isCurrentlyOpen = $dropdown.hasClass("show");
        closeAllNonPinnedDropdowns($dropdown.attr("id"));
        $('.menu-item-wrapper').removeClass('wrapper--active'); 
        if (!isCurrentlyOpen) {
            $dropdown.stop(true, true).show("blind", { direction: "vertical" }, 100).addClass("show");
            if ($wrapper && !$dropdown.hasClass('pinned')) $wrapper.addClass("wrapper--active"); 
        }
    }

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
    
    $mainSearchInput.on('blur', function() {
        setTimeout(function() {
            if (!$mainSearchDropdown.is(':hover')) {
                $mainSearchDropdown.hide("blind", { direction: "vertical" }, 100).removeClass("show");
            }
        }, 150);
    });

    $mainSearchDropdown.on('mousedown', function(e) {
        const $target = $(e.target);
        if ($target.hasClass('view-results-button') || $target.hasClass('remove-history-icon')) {
            e.preventDefault();
        }
        if ($target.hasClass('view-results-button')) {
            const results = $target.data('results');
            $mainSearchDropdown.empty();
            $mainSearchDropdown.append('<div class="search-results-header">نتایج جستجو</div>');
            $.each(results, function(index, result) {
                const $resultLink = $("<a>").attr("href", result.href).addClass('result-item').text(result.text);
                $mainSearchDropdown.append($resultLink);
            });
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
            const fullText = $(this).attr('title') || $(this).text();
            setActiveItem(fullText, $target.attr('href'));
            addToHistory(fullText, $target.attr('href'));
            closeAllNonPinnedDropdowns();
        }
    });

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

    $(window).on("click", (event) => {
        if (!$(event.target).closest(".menu-item-wrapper, .search-box-wrapper, .icon-wrapper, .avatar, .dropdown-pin-icon, .main-search-dropdown, .sidebar-dropdown, .history-dropdown, .favorites-dropdown, .notification-dropdown, .profile-dropdown, .search-options-dropdown").length) {
            closeAllNonPinnedDropdowns();
        }
    });
});

// کد قبلی را با این کد جایگزین کنید
$("#sidebarDropdown, #favoritesDropdown, #historyDropdown").tooltip({
    // تولتیپ فقط برای لینک‌هایی که این ویژگی را دارند فعال می‌شود
    items: "a[data-tooltip-text]", 
    classes: {
        "ui-tooltip": "ui-tooltip-custom"
    },
    show: {
        delay: 400
    },
    position: {
        my: "center top",
        at: "center bottom+5",
    },
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
    // محتوای تولتیپ از ویژگی سفارشی ما خوانده می‌شود
    content: function() {
        return $(this).attr('data-tooltip-text');
    }
});
// این کد را به انتهای فایل script.js اضافه کنید
$("#active-item-text").tooltip({
    // فقط زمانی که 'data-full-text' وجود دارد تولتیپ فعال شود
    items: "[data-full-text]", 
    classes: {
        // یک کلاس جدید برای استایل‌دهی جداگانه
        "ui-tooltip": "ui-tooltip-custom tooltip--active-item" 
    },
    position: {
        my: "center top",
        at: "center bottom+8", // دقیقا زیر و وسط با کمی فاصله
    },
    content: function() {
        // خواندن متن کامل از دیتا
        return $(this).attr('data-full-text');
    }
});
// این بلوک را پیدا کرده و با کد زیر جایگزین کنید
// این بلوک را جایگزین بلوک قبلی برای #mainSearchDropdown کنید
$("#mainSearchDropdown").tooltip({
    // ۱. انتخابگر صحیح: به دنبال لینک‌هایی می‌گردد که ویژگی title دارند
    items: "a[title]",

    // ۲. کلاس‌های سفارشی: برای اعمال استایل‌های شما
    classes: {
        "ui-tooltip": "ui-tooltip-custom tooltip-search-input"
    },

    show: {
        delay: 400
    },

    // ۳. موقعیت‌دهی صحیح: با جابجایی به سمت راست
    position: {
        my: "center top",
        at: "center+0 bottom+5" // عدد ۲۰۰ را می‌توانید تغییر دهید
    },

    // ۴. محتوای صحیح: محتوا را از ویژگی title می‌خواند
    content: function() {
        return $(this).attr('title');
    }
});