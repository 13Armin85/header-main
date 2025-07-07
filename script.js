$(document).ready(function() {
    const favoriteItems = new Set();
    let historyItems = [];

    const $activeItemContainer = $("#active-item-container");
    const $activeItemText = $("#active-item-text");
    const $activeItemStar = $("#active-item-star");

    function closeAllNonPinnedDropdowns(excludeId = null, animationDuration = 100) {
        $(".sidebar-dropdown, .history-dropdown, .favorites-dropdown, .notification-dropdown, .profile-dropdown, .search-options-dropdown").each(function() {
            const $dropdown = $(this);
            // فقط دراپ‌داون‌هایی که show هستند، ID آن‌ها excludeId نیست و پین نشده‌اند را می‌بندد.
            if ($dropdown.hasClass("show") && $dropdown.attr("id") !== excludeId && !$dropdown.hasClass("pinned")) {
                $dropdown.hide("blind", { direction: "vertical" }, animationDuration, function() {
                    $(this).removeClass("show");
                });
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

    function addToHistory(text, href) {
        const existingIndex = historyItems.findIndex((item) => item.href === href);
        if (existingIndex > -1) {
            historyItems.splice(existingIndex, 1);
        }
        historyItems.unshift({ text, href });
        const MAX_HISTORY_ITEMS = 10;
        if (historyItems.length > MAX_HISTORY_ITEMS) {
            historyItems.pop();
        }
        updateHistoryDropdown();
    }

    function updateHistoryDropdown() {
        const $historyContent = $("#history-content");
        const searchTerm = $("#history-search-input").val() ? $("#history-search-input").val().trim().toLowerCase() : "";

        $historyContent.empty();

        const filteredItems = historyItems.filter(item =>
            item.text.toLowerCase().includes(searchTerm)
        );

        if (historyItems.length === 0) {
            $historyContent.html(createEmptyStateHTML("تاریخچه‌ای وجود ندارد."));
        } else if (filteredItems.length === 0) {
            $historyContent.html(createEmptyStateHTML("نتیجه‌ای یافت نشد."));
        } else {
            $.each(filteredItems, function(index, item) {
                const $historyLink = $("<a>")
                    .attr("href", item.href)
                    .addClass("history-item")
                    .text(item.text);

                $historyLink.on("click", function(e) {
                    e.preventDefault();
                    setActiveItem(item.text, item.href);
                    addToHistory(item.text, item.href);
                    const $historyDropdown = $("#historyDropdown");
                    if ($historyDropdown.length && !$historyDropdown.hasClass("pinned")) {
                        $historyDropdown.hide("blind", { direction: "vertical" }, 100, function() {
                            $(this).removeClass("show");
                        });
                    }
                });
                $historyContent.append($historyLink);
            });
        }
    }

    function setActiveItem(text, href) {
        $activeItemText.text(text);
        $activeItemContainer.data({ text: text, href: href });
        const itemString = JSON.stringify([text, href]);
        const isFavorited = favoriteItems.has(itemString);
        $activeItemStar.toggleClass("favorited", isFavorited);
        $activeItemStar.toggleClass("fas", isFavorited);
        $activeItemStar.toggleClass("far", !isFavorited);
    }

    function toggleFavorite(text, href) {
        const itemString = JSON.stringify([text, href]);
        if (favoriteItems.has(itemString)) {
            favoriteItems.delete(itemString);
        } else {
            favoriteItems.add(itemString);
        }
        updateAllViews(text, href, itemString);
    }

    function updateAllViews(text, href, itemString) {
        const isFavorited = favoriteItems.has(itemString);
        $(".sidebar-item-wrapper").each(function() {
            const $wrapper = $(this);
            const $link = $wrapper.find("a");
            if (
                $link.text() === text &&
                $link.attr("href") === href
            ) {
                const $star = $wrapper.find(".favorite-star");
                $star.toggleClass("favorited", isFavorited);
                $star.toggleClass("fas", isFavorited);
                $star.toggleClass("far", !isFavorited);
            }
        });
        if ($activeItemContainer.data("text") === text) {
            $activeItemStar.toggleClass("favorited", isFavorited);
            $activeItemStar.toggleClass("fas", isFavorited);
            $activeItemStar.toggleClass("far", !isFavorited);
        }
        updateFavoritesDropdown();
    }

    function updateFavoritesDropdown() {
        const $favoritesContent = $("#favorites-content");
        const searchTerm = $("#favorites-search-input").val() ? $("#favorites-search-input").val().trim().toLowerCase() : "";

        $favoritesContent.empty();

        const filteredItems = Array.from(favoriteItems).filter((itemString) => {
            const [text] = JSON.parse(itemString);
            return text.toLowerCase().includes(searchTerm);
        });

        if (favoriteItems.size === 0) {
            $favoritesContent.html(createEmptyStateHTML("هیچ موردی در علاقه‌مندی‌ها وجود ندارد."));
        } else if (filteredItems.length === 0) {
            $favoritesContent.html(createEmptyStateHTML("نتیجه‌ای یافت نشد."));
        } else {
            $.each(filteredItems, function(index, itemString) {
                const [text, href] = JSON.parse(itemString);
                const $favoriteDiv = $("<div>").addClass("favorite-item");

                const $link = $("<a>")
                    .attr("href", href)
                    .text(text);
                $link.on("click", function(e) {
                    e.preventDefault();
                    setActiveItem(text, href);
                    addToHistory(text, href);
                    const $favoritesDropdown = $("#favoritesDropdown");
                    if ($favoritesDropdown.length && !$favoritesDropdown.hasClass("pinned")) {
                        $favoritesDropdown.hide("blind", { direction: "vertical" }, 100, function() {
                            $(this).removeClass("show");
                        });
                        $("#favorites-menu-wrapper").removeClass("wrapper--active");
                    }
                });

                const $removeIcon = $("<i>")
                    .addClass("fas fa-times remove-favorite-icon");
                $removeIcon.on("click", function(e) {
                    e.stopPropagation();
                    toggleFavorite(text, href);
                });

                $favoriteDiv.append($link, $removeIcon);
                $favoritesContent.append($favoriteDiv);
            });
        }
    }

    function filterSidebar() {
        const searchTerm = $("#sidebar-search-input").val().trim().toLowerCase();
        const $accordionGroups = $(".sidebar-dropdown .accordion-group");

        $accordionGroups.each(function() {
            const $group = $(this);
            const $header = $group.children(".accordion-header");
            const $body = $group.children(".accordion-body");
            const $items = $body.find(".sidebar-item-wrapper");
            let groupHasVisibleItems = false;

            $items.each(function() {
                const $item = $(this);
                const itemText = $item.find("a").text().toLowerCase();
                const isMatch = itemText.includes(searchTerm);
                $item.toggle(isMatch);
                if (isMatch) {
                    groupHasVisibleItems = true;
                }
            });

            $group.toggle(groupHasVisibleItems || searchTerm.length === 0);

            if (searchTerm.length > 0 && groupHasVisibleItems) {
                if (!$body.hasClass("open")) {
                    $body.show("blind", { direction: "vertical" }, 100, function() {
                        $(this).addClass("open");
                    });
                    $header.addClass("active");
                }
            } else if (searchTerm.length === 0) {
                if ($body.hasClass("open")) {
                    $body.hide("blind", { direction: "vertical" }, 100, function() {
                        $(this).removeClass("open");
                    });
                    $header.removeClass("active");
                }
            }
        });
    }

    function initializeNotifications() {
        const $tabsContainer = $(".notification-tabs");
        const $markAllReadBtn = $(".notification-dropdown-header a");

        if ($tabsContainer.length) {
            $tabsContainer.on("click", "button", function() {
                $tabsContainer.find(".active").removeClass("active");
                $(this).addClass("active");
                filterNotifications();
            });
        }

        if ($markAllReadBtn.length) {
            $markAllReadBtn.on("click", function(e) {
                e.preventDefault();
                $(".notification-item.unread").removeClass("unread");
                filterNotifications();
            });
        }
    }

    function filterNotifications() {
        const $activeTabButton = $(".notification-tabs button.active");
        if (!$activeTabButton.length) return;
        const activeTab = $activeTabButton.text().trim();
        const $allItems = $(".notification-dropdown-content .notification-item");

        $allItems.each(function() {
            const $item = $(this);
            const isUnread = $item.hasClass("unread");
            if (activeTab === "همه") {
                $item.css("display", "flex");
            } else if (activeTab === "خوانده‌نشده") {
                $item.css("display", isUnread ? "flex" : "none");
            }
        });
    }

    function initializeSearchOptions() {
        const $searchOptions = $("#searchOptionsDropdown a");

        $searchOptions.each(function() {
            const $check = $("<i>").addClass("fas fa-check search-option-check");
            $(this).prepend($check);
        });

        $searchOptions.on("click", function(e) {
            e.preventDefault();
            $searchOptions.removeClass("selected");
            $(this).addClass("selected");

            $("#searchOptionsDropdown").hide("blind", { direction: "vertical" }, 100, function() {
                $(this).removeClass("show");
            });
        });
    }

    function initializeApp() {
        $(".sidebar-dropdown .accordion-group .accordion-header").on("click", function() {
            const $header = $(this);
            const $body = $header.next(".accordion-body");
            $header.toggleClass("active");
            $body.toggle("blind", { direction: "vertical" }, 300, function() {
                $(this).toggleClass("open", $(this).is(":visible"));
            });
        });

        $(".sidebar-dropdown .accordion-body a").each(function() {
            const $link = $(this);
            if ($link.parent().hasClass("sidebar-item-wrapper")) {
                return;
            }
            const text = $link.text().trim();
            const href = $link.attr("href");
            const $wrapper = $("<div>").addClass("sidebar-item-wrapper");
            const $starIcon = $("<i>").addClass("far fa-star favorite-star");

            $starIcon.on("click", function(e) {
                e.stopPropagation();
                e.preventDefault();
                toggleFavorite(text, href);
            });

            $link.on("click", function(e) {
                e.preventDefault();
                setActiveItem(text, href);
                addToHistory(text, href);
                if (!$("#sidebarDropdown").hasClass("pinned")) {
                    $("#sidebarDropdown").hide("blind", { direction: "vertical" }, 100, function() {
                        $(this).removeClass("show");
                    });
                    $("#all-menu-wrapper").removeClass("wrapper--active");
                }
            });

            $link.wrap($wrapper);
            $link.parent().append($starIcon);
        });

        $activeItemStar.on("click", function() {
            const text = $activeItemContainer.data("text");
            const href = $activeItemContainer.data("href");
            if (text && href) {
                toggleFavorite(text, href);
            }
        });

        $("#sidebar-search-input").on("input", filterSidebar);
        $("#favorites-search-input").on("input", updateFavoritesDropdown);
        $("#history-search-input").on("input", updateHistoryDropdown);

        updateFavoritesDropdown();
        initializeNotifications();
        updateHistoryDropdown();
        initializeSearchOptions();
    }

    initializeApp();

    const ANIMATION_DURATION = 300;

    function toggleDropdown($dropdown, $wrapper = null) {
        // اگر دراپ‌داون پین شده باشد و تلاش برای بستن آن از طریق wrapper باشد، از عملیات خارج می‌شود.
        if ($wrapper && $dropdown.hasClass("pinned")) return;

        const isCurrentlyOpen = $dropdown.hasClass("show");
        const excludeId = $dropdown.attr("id");

        closeAllNonPinnedDropdowns(excludeId, ANIMATION_DURATION);

        if (isCurrentlyOpen) {
            // اگر دراپ‌داون باز است و پین نشده، آن را می‌بندد.
            if (!$dropdown.hasClass("pinned")) {
                $dropdown.stop(true, true).hide("blind", { direction: "vertical" }, ANIMATION_DURATION, function() {
                    $(this).removeClass("show");
                    if ($wrapper) $wrapper.removeClass("wrapper--active");
                });
            }
        } else {
            // اگر دراپ‌داون بسته است، آن را باز می‌کند.
            $dropdown.stop(true, true).show("blind", { direction: "vertical" }, ANIMATION_DURATION, function() {
                $(this).addClass("show");
                if ($wrapper) $wrapper.addClass("wrapper--active");
            });
        }
    }

    function toggleSidebar() {
        toggleDropdown($("#sidebarDropdown"), $("#all-menu-wrapper"));
    }

    function toggleFavoritesMenu() {
        toggleDropdown($("#favoritesDropdown"), $("#favorites-menu-wrapper"));
    }

    function toggleHistory() {
        toggleDropdown($("#historyDropdown"), $("#history-menu-wrapper"));
    }

    function toggleSearchOptions() {
        toggleDropdown($("#searchOptionsDropdown"));
    }

    function toggleNotifications() {
        toggleDropdown($("#notificationDropdown"));
        console.log("Notification dropdown toggled with blind effect.");
    }

    function toggleProfile() {
        toggleDropdown($("#profileDropdown"));
    }

    const $pinIcons = $(".dropdown-pin-icon");
    const $allDropdowns = $(".sidebar-dropdown, .history-dropdown, .favorites-dropdown");

    function unpinAllMenus() {
        // تمام منوها را از حالت پین خارج می‌کند و کلاس مربوطه را حذف می‌کند.
        $allDropdowns.removeClass("pinned");
        // به این قسمت نیازی نیست که منوها را پنهان کنیم، چون این کار را به عهده toggleDropdown یا closeAllNonPinnedDropdowns می‌گذاریم.
        $pinIcons.removeClass("pinned-active");
        $("body").removeClass("body-pinned");
    }

    $pinIcons.on("click", function(event) {
        event.stopPropagation();
        const $dropdown = $(this).closest(".sidebar-dropdown, .history-dropdown, .favorites-dropdown");
        if (!$dropdown.length) return;

        const isCurrentlyPinned = $dropdown.hasClass("pinned");

        if (isCurrentlyPinned) {
            // اگر پین شده است و می‌خواهیم از پین خارج کنیم:
            $dropdown.removeClass("pinned");
            $(this).removeClass("pinned-active");
            $("body").removeClass("body-pinned");

            // بعد از unpin شدن، آن را مانند یک دراپ‌داون معمولی در نظر می‌گیریم.
            // این بدان معناست که اگر خارج از آن کلیک شود، بسته خواهد شد.
            // نیازی به بستن فوری آن در اینجا نیست، چون ممکن است کاربر بخواهد آن را باز نگه دارد.
        } else {
            // اگر پین نشده است و می‌خواهیم پین کنیم:
            unpinAllMenus(); // ابتدا تمام منوهای دیگر را از پین خارج می‌کنیم
            $dropdown.addClass("pinned");
            $(this).addClass("pinned-active");
            $("body").addClass("body-pinned");

            // مطمئن می‌شویم که منوی تازه پین شده باز است.
            if (!$dropdown.hasClass("show")) {
                $dropdown.stop(true, true).show("blind", { direction: "vertical" }, ANIMATION_DURATION, function() {
                    $(this).addClass("show");
                });
            }
            $dropdown.closest('.menu-item-wrapper')?.removeClass('wrapper--active');
        }
    });

    $(window).on("click", function(event) {
        const $clickTarget = $(event.target);
        const $importantElements = $clickTarget.closest(
            ".menu-item-wrapper, .search-box-wrapper, .icon-wrapper, .avatar, .dropdown-pin-icon, .sidebar-dropdown, .history-dropdown, .favorites-dropdown, .notification-dropdown, .profile-dropdown, .search-options-dropdown"
        );

        // اگر خارج از هر یک از عناصر مهم کلیک شد، منوهای غیر پین‌شده را می‌بندیم.
        if (!$importantElements.length) {
            closeAllNonPinnedDropdowns();
        }
    });


    $('#all-menu-wrapper').on('click', function(e) {
        if ($(e.target).closest('#sidebarDropdown').length && !$("#sidebarDropdown").hasClass("pinned")) return; // اگر داخل منوی باز کلیک شد و پین نبود، کاری نکن
        toggleSidebar();
    });
    $('#favorites-menu-wrapper').on('click', function(e) {
        if ($(e.target).closest('#favoritesDropdown').length && !$("#favoritesDropdown").hasClass("pinned")) return;
        toggleFavoritesMenu();
    });
    $('#history-menu-wrapper').on('click', function(e) {
        if ($(e.target).closest('#historyDropdown').length && !$("#historyDropdown").hasClass("pinned")) return;
        toggleHistory();
    });

    $('.search-category-button').on('click', function(e) {
        e.stopPropagation();
        toggleSearchOptions();
    });

    $('#notification-wrapper .icon').on('click', function(e) {
        e.stopPropagation();
        toggleNotifications();
    });

    $('.avatar').on('click', function(event) {
        event.stopPropagation();
        toggleProfile();
    });

    function setupClearIcon(searchContainerSelector) {
        const $searchContainer = $(searchContainerSelector);
        if (!$searchContainer.length) return;

        const $input = $searchContainer.find("input");
        const $clearIcon = $searchContainer.find(".clear-icon");

        if (!$input.length || !$clearIcon.length) return;

        $clearIcon.css("display", $input.val() ? "block" : "none");

        $input.on("input", function() {
            $clearIcon.css("display", $(this).val() ? "block" : "none");
        });

        $input.on("blur", function() {
            setTimeout(() => {
                $clearIcon.css("display", "none");
            }, 150);
        });

        $input.on("focus", function() {
            if ($(this).val()) {
                $clearIcon.css("display", "block");
            }
        });

        $clearIcon.on("click", function() {
            $input.val("").trigger("input");
            $clearIcon.css("display", "none");
            $input.focus();
        });
    }

    setupClearIcon(".search-box-wrapper");
    setupClearIcon("#sidebarDropdown .dropdown-search");
    setupClearIcon("#historyDropdown .history-dropdown-search");
    setupClearIcon("#favoritesDropdown .favorites-dropdown-search");
});