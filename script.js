$(document).ready(function() {
    // --- بخش متغیرهای اصلی ---
    const favoriteItems = new Set();
    let historyItems = [];
    let mainSearchHistory = JSON.parse(localStorage.getItem('mainSearchHistory')) || [];

    const $activeItemContainer = $("#active-item-container");
    const $activeItemText = $("#active-item-text");
    const $activeItemStar = $("#active-item-star");
    const $mainSearchInput = $(".search-input");
    const $mainSearchDropdown = $("#mainSearchDropdown");

    // --- توابع اصلی برنامه ---

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

    // --- بخش جستجوی اصلی (بالا سمت چپ) ---

    function updateMainSearchHistory(term) {
        if (!term) return;
        mainSearchHistory = mainSearchHistory.filter(item => item !== term);
        mainSearchHistory.unshift(term);
        if (mainSearchHistory.length > 5) mainSearchHistory.pop();
        localStorage.setItem('mainSearchHistory', JSON.stringify(mainSearchHistory));
    }

    function displayMainSearchHistory() {
        $mainSearchDropdown.empty().show("blind", { direction: "vertical" }, 100).addClass('show');
        if (mainSearchHistory.length > 0) {
            $mainSearchDropdown.append('<div class="search-history-header">جستجوهای اخیر</div>');
            $.each(mainSearchHistory, function(index, term) {
                const $historyLink = $("<a>").attr("href", "#").addClass('history-search-item').text(term);
                const $removeIcon = $("<i>").addClass("fas fa-times remove-history-icon").data('term', term);
                $historyLink.append($removeIcon);
                $mainSearchDropdown.append($historyLink);
            });
        } else {
            $mainSearchDropdown.append(createEmptyStateHTML("تاریخچه جستجو خالی است."));
        }
    }

    function executeMainSearch(term) {
        if (!term) return;
        updateMainSearchHistory(term);
        $mainSearchDropdown.empty().show().addClass('show');
        const results = [];
        $("#sidebarDropdown .sidebar-item-wrapper a").each(function() {
            if ($(this).text().toLowerCase().includes(term.toLowerCase())) {
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
    
  $mainSearchDropdown.on('click', function(e) {
    const $target = $(e.target);
    
    // جلوگیری از بسته‌شدن منو در کلیک روی داخل منو
    e.stopPropagation(); 

    if ($target.hasClass('view-results-button')) {
        const results = $target.data('results');
        $mainSearchDropdown.empty();
        $mainSearchDropdown.append('<div class="search-results-header">نتایج جستجو</div>');
        $.each(results, function(index, result) {
            const $resultLink = $("<a>").attr("href", result.href).addClass('result-item').text(result.text);
            $mainSearchDropdown.append($resultLink);
        });
    } 
    else if ($target.hasClass('remove-history-icon')) {
        const termToRemove = $target.data('term');
        mainSearchHistory = mainSearchHistory.filter(item => item !== termToRemove);
        localStorage.setItem('mainSearchHistory', JSON.stringify(mainSearchHistory));
        displayMainSearchHistory();
    } 
    else if ($target.hasClass('history-search-item')) {
        const term = $target.clone().children().remove().end().text();
        $mainSearchInput.val(term).focus();
        executeMainSearch(term);
    } 
    else if ($target.hasClass('result-item')) {
        e.preventDefault();
        setActiveItem($target.text(), $target.attr('href'));
        addToHistory($target.text(), $target.attr('href'));
        closeAllNonPinnedDropdowns();
    }
});
    // --- سایر توابع برنامه ---

    function addToHistory(text, href) {
        historyItems = historyItems.filter(item => item.href !== href);
        historyItems.unshift({ text, href });
        if (historyItems.length > 10) historyItems.pop();
        updateHistoryDropdown();
    }

    function updateHistoryDropdown() {
        const $historyContent = $("#history-content");
        $historyContent.empty();
        if (historyItems.length === 0) {
            $historyContent.html(createEmptyStateHTML("تاریخچه‌ای وجود ندارد."));
            return;
        }
        $.each(historyItems, function(index, item) {
            const $link = $("<a>").attr("href", item.href).addClass("history-item").text(item.text);
            $link.on("click", function(e) {
                e.preventDefault();
                setActiveItem(item.text, item.href);
                closeAllNonPinnedDropdowns();
            });
            $historyContent.append($link);
        });
    }

    function setActiveItem(text, href) {
        $activeItemText.text(text);
        $activeItemContainer.data({ text, href });
        const isFavorited = favoriteItems.has(JSON.stringify([text, href]));
        $activeItemStar.toggleClass("favorited fas", isFavorited).toggleClass("far", !isFavorited);
    }

    function toggleFavorite(text, href) {
        const itemString = JSON.stringify([text, href]);
        if (favoriteItems.has(itemString)) {
            favoriteItems.delete(itemString);
        } else {
            favoriteItems.add(itemString);
        }
        updateAllViews(text, href);
    }

    function updateAllViews(text, href) {
        const itemString = JSON.stringify([text, href]);
        const isFavorited = favoriteItems.has(itemString);
        $(".sidebar-item-wrapper").each(function() {
            const $link = $(this).find("a");
            if ($link.text() === text && $link.attr("href") === href) {
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
        $favoritesContent.empty();
        if (favoriteItems.size === 0) {
            $favoritesContent.html(createEmptyStateHTML("هیچ موردی در علاقه‌مندی‌ها وجود ندارد."));
            return;
        }
        favoriteItems.forEach(itemString => {
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
    }

    function filterSidebar(searchTerm) {
        $(".sidebar-dropdown .accordion-group").each(function() {
            const $group = $(this);
            let groupHasVisibleItems = false;
            $group.find(".sidebar-item-wrapper").each(function() {
                const isMatch = $(this).find("a").text().toLowerCase().includes(searchTerm);
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
    }

    initializeApp();

    // --- بخش مدیریت باز و بسته شدن منوها ---

    function toggleDropdown($dropdown, $wrapper = null) {
        if ($wrapper && $dropdown.hasClass("pinned")) return;
        const isCurrentlyOpen = $dropdown.hasClass("show");
        closeAllNonPinnedDropdowns($dropdown.attr("id"));
        if (!isCurrentlyOpen) {
            $dropdown.stop(true, true).show("blind", { direction: "vertical" }, 100).addClass("show");
            if ($wrapper) $wrapper.addClass("wrapper--active");
        }
    }

    $('#all-menu-wrapper').on('click', (e) => { if (!$(e.target).closest('#sidebarDropdown').length) toggleDropdown($("#sidebarDropdown"), $("#all-menu-wrapper")); });
    $('#favorites-menu-wrapper').on('click', (e) => { if (!$(e.target).closest('#favoritesDropdown').length) toggleDropdown($("#favoritesDropdown"), $("#favorites-menu-wrapper")); });
    $('#history-menu-wrapper').on('click', (e) => { if (!$(e.target).closest('#historyDropdown').length) toggleDropdown($("#historyDropdown"), $("#history-menu-wrapper")); });
    $('.search-category-button').on('click', (e) => { e.stopPropagation(); toggleDropdown($("#searchOptionsDropdown")); });
    $('#notification-wrapper .icon').on('click', (e) => { e.stopPropagation(); toggleDropdown($("#notificationDropdown")); });
    $('.avatar').on('click', (e) => { e.stopPropagation(); toggleDropdown($("#profileDropdown")); });


    $(".dropdown-pin-icon").on("click", function(event) {
        event.stopPropagation();
        const $dropdown = $(this).closest(".sidebar-dropdown, .history-dropdown, .favorites-dropdown");
        if (!$dropdown.length) return;
        const isCurrentlyPinned = $dropdown.hasClass("pinned");
        $(".sidebar-dropdown, .history-dropdown, .favorites-dropdown").removeClass("pinned");
        $(".dropdown-pin-icon").removeClass("pinned-active");
        $("body").removeClass("body-pinned");
        if (!isCurrentlyPinned) {
            $dropdown.addClass("pinned");
            $(this).addClass("pinned-active");
            $("body").addClass("body-pinned");
            if (!$dropdown.hasClass("show")) $dropdown.stop(true, true).show().addClass("show");
        }
        $('.menu-item-wrapper').removeClass('wrapper--active');
    });

    $(window).on("click", (event) => {
        if (!$(event.target).closest(".menu-item-wrapper, .search-box-wrapper, .icon-wrapper, .avatar, .dropdown-pin-icon, .main-search-dropdown, .sidebar-dropdown, .history-dropdown, .favorites-dropdown, .notification-dropdown, .profile-dropdown, .search-options-dropdown").length) {
            closeAllNonPinnedDropdowns();
        }
    });
});