class HairWashTracker {
    constructor() {
        this.currentDate = new Date();
        this.washDays = JSON.parse(localStorage.getItem('washDays') || '[]');
        this.events = JSON.parse(localStorage.getItem('events') || '[]');
        this.profile = JSON.parse(localStorage.getItem('hairProfile') || '{}');
        this.notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadProfile();
        this.renderCalendar();
        this.updateLastWashInfo();
        this.updateNextWashInfo();
        this.renderEvents();
        this.checkNotificationPermission();
        this.scheduleReminders();
    }

    bindEvents() {
        // Quick wash button
        document.getElementById('washTodayBtn').addEventListener('click', () => {
            this.logWash(new Date());
        });

        // Profile navigation
        document.getElementById('openProfileBtn').addEventListener('click', () => {
            this.showProfileView();
        });

        document.getElementById('backToMainBtn').addEventListener('click', () => {
            this.showMainView();
        });

        // Calendar navigation
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        });

        // Add event
        document.getElementById('addEventBtn').addEventListener('click', () => {
            this.addEvent();
        });

        // Notification modal
        document.getElementById('enableNotifications').addEventListener('click', () => {
            this.enableNotifications();
        });

        document.getElementById('skipNotifications').addEventListener('click', () => {
            this.hideNotificationModal();
        });

        // Profile events
        document.getElementById('saveProfile').addEventListener('click', () => {
            this.saveProfile();
        });

        document.getElementById('autoSchedule').addEventListener('click', () => {
            this.smartAutoScheduleWashes();
        });

        // Frequency range validation
        document.getElementById('minFrequency').addEventListener('change', () => {
            this.validateFrequencyRange();
        });

        document.getElementById('maxFrequency').addEventListener('change', () => {
            this.validateFrequencyRange();
        });
    }

    logWash(date) {
        const dateStr = this.formatDate(date);
        if (!this.washDays.includes(dateStr)) {
            this.washDays.push(dateStr);
            this.saveData();
            this.renderCalendar();
            this.updateLastWashInfo();
            this.updateNextWashInfo();
            this.showSuccess('🛁✨ Hair wash logged! You\'re glowing! ✨🫧');
        } else {
            this.showSuccess('🫧 Already logged for this day! Your hair is squeaky clean! ✨');
        }
    }

    addEvent() {
        const dateInput = document.getElementById('eventDate');
        const nameInput = document.getElementById('eventName');
        const typeSelect = document.getElementById('eventType');

        if (!dateInput.value || !nameInput.value) {
            alert('Please fill in both date and event name');
            return;
        }

        const event = {
            id: Date.now(),
            date: dateInput.value,
            name: nameInput.value,
            type: typeSelect.value
        };

        this.events.push(event);
        this.saveData();
        this.renderCalendar();
        this.renderEvents();

        // Clear inputs
        dateInput.value = '';
        nameInput.value = '';
        typeSelect.value = 'event';

        // Automatically schedule hair wash one day before events if enabled
        if (event.type === 'event' && this.profile.eventWashReminder !== false) {
            const eventDate = new Date(event.date);
            const dayBefore = new Date(eventDate);
            dayBefore.setDate(dayBefore.getDate() - 1);
            const dayBeforeStr = this.formatDate(dayBefore);

            // Check if wash is already scheduled for that day
            const existingWash = this.events.find(e =>
                e.date === dayBeforeStr && e.type === 'wash'
            );

            if (!existingWash && dayBefore >= new Date()) {
                this.events.push({
                    id: Date.now() + 1,
                    date: dayBeforeStr,
                    name: `Wash hair for ${event.name}`,
                    type: 'wash'
                });
                this.saveData();
                this.renderCalendar();
                this.renderEvents();
                this.showSuccess(`🛁✨ Auto-scheduled hair wash for ${this.formatDisplayDate(dayBeforeStr)} (day before ${event.name})!`);
            }
        }
    }

    renderCalendar() {
        const calendar = document.getElementById('calendar');
        const monthYear = document.getElementById('currentMonth');

        // Update month/year display
        monthYear.textContent = this.currentDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });

        // Clear calendar
        calendar.innerHTML = '';

        // Add day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const header = document.createElement('div');
            header.textContent = day;
            header.style.fontWeight = 'bold';
            header.style.padding = '8px 4px';
            header.style.textAlign = 'center';
            header.style.background = '#f8f9fa';
            header.style.fontSize = '0.8rem';
            header.style.color = '#666';
            calendar.appendChild(header);
        });

        // Get first day of month and number of days
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        // Generate calendar days
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);

            const dayElement = this.createDayElement(date);
            calendar.appendChild(dayElement);
        }
    }

    createDayElement(date) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = date.getDate();

        const dateStr = this.formatDate(date);
        const today = this.formatDate(new Date());

        // Add classes based on date status
        if (date.getMonth() !== this.currentDate.getMonth()) {
            dayElement.classList.add('other-month');
        }

        if (dateStr === today) {
            dayElement.classList.add('today');
        }

        if (this.washDays.includes(dateStr)) {
            dayElement.classList.add('wash-day');
        }

        // Check for events
        const dayEvents = this.events.filter(event => event.date === dateStr);
        const hasWash = this.washDays.includes(dateStr);

        if (dayEvents.length > 0) {
            // Determine primary class based on priority: wash-day > event-day > scheduled-wash
            let hasEvent = false;
            let hasScheduledWash = false;

            dayEvents.forEach(event => {
                if (event.type === 'event') {
                    hasEvent = true;
                } else if (event.type === 'wash') {
                    hasScheduledWash = true;
                }
            });

            // Apply classes with priority (wash-day overrides others)
            if (hasWash) {
                // Wash day takes priority, but we might show multiple icons
                dayElement.classList.add('wash-day');
                if (hasEvent || hasScheduledWash) {
                    dayElement.classList.add('multiple-events');
                }
            } else if (hasEvent && hasScheduledWash) {
                dayElement.classList.add('multiple-events');
            } else if (hasEvent) {
                dayElement.classList.add('event-day');
            } else if (hasScheduledWash) {
                dayElement.classList.add('scheduled-wash');
            }
        }

        // Add click handler for logging washes
        dayElement.addEventListener('click', () => {
            if (date.getMonth() === this.currentDate.getMonth()) {
                if (this.washDays.includes(dateStr)) {
                    if (confirm('Remove wash log for this day?')) {
                        this.washDays = this.washDays.filter(d => d !== dateStr);
                        this.saveData();
                        this.renderCalendar();
                        this.updateLastWashInfo();
                        this.updateNextWashInfo();
                    }
                } else {
                    this.logWash(date);
                }
            }
        });

        return dayElement;
    }

    renderEvents() {
        const eventsList = document.getElementById('eventsList');
        eventsList.innerHTML = '';

        // Sort events by date
        const sortedEvents = [...this.events].sort((a, b) => new Date(a.date) - new Date(b.date));

        // Show only upcoming events (including today), but exclude wash reminders
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcomingEvents = sortedEvents.filter(event => {
            const eventDate = new Date(event.date);
            eventDate.setHours(0, 0, 0, 0);
            return eventDate >= today && event.type === 'event'; // Only show actual events, not wash reminders
        });

        if (upcomingEvents.length === 0) {
            eventsList.innerHTML = '<p style="color: #666; text-align: center;">No upcoming events</p>';
            return;
        }

        upcomingEvents.forEach(event => {
            const eventElement = document.createElement('div');
            eventElement.className = 'event-item';

            eventElement.innerHTML = `
                <div class="event-info">
                    <span class="event-date">${this.formatDisplayDate(event.date)}</span>
                    <span class="event-name">${event.name}</span>
                    <span class="event-type ${event.type}">${event.type}</span>
                </div>
                <button class="delete-event" onclick="tracker.deleteEvent(${event.id})">×</button>
            `;

            eventsList.appendChild(eventElement);
        });
    }

    deleteEvent(eventId) {
        this.events = this.events.filter(event => event.id !== eventId);
        this.saveData();
        this.renderCalendar();
        this.renderEvents();
    }



    checkNotificationPermission() {
        if (!this.notificationsEnabled && 'Notification' in window) {
            document.getElementById('notificationModal').classList.remove('hidden');
        }
    }

    enableNotifications() {
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.notificationsEnabled = true;
                    localStorage.setItem('notificationsEnabled', 'true');
                    this.scheduleReminders();
                    this.showSuccess('Notifications enabled! 🔔');
                }
                this.hideNotificationModal();
            });
        }
    }

    hideNotificationModal() {
        document.getElementById('notificationModal').classList.add('hidden');
    }

    scheduleReminders() {
        if (!this.notificationsEnabled || Notification.permission !== 'granted') return;

        // Check for scheduled washes today
        const today = this.formatDate(new Date());
        const todayEvents = this.events.filter(event =>
            event.date === today && event.type === 'wash'
        );

        if (todayEvents.length > 0) {
            // Schedule reminder for evening (8 PM)
            const now = new Date();
            const reminderTime = new Date();
            reminderTime.setHours(20, 0, 0, 0);

            if (reminderTime > now) {
                const timeUntilReminder = reminderTime - now;
                setTimeout(() => {
                    new Notification('Hair Wash Reminder', {
                        body: 'Don\'t forget to wash your hair tonight!',
                        icon: '💧'
                    });
                }, timeUntilReminder);
            }
        }
    }

    showSuccess(message) {
        // Simple success feedback
        const btn = document.getElementById('washTodayBtn');
        const originalText = btn.textContent;
        btn.textContent = message;
        btn.style.background = '#28a745';

        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    formatDisplayDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }

    showProfileView() {
        document.getElementById('mainView').style.display = 'none';
        document.getElementById('profileView').classList.remove('hidden');
        document.getElementById('profileView').style.display = 'block';
    }

    showMainView() {
        document.getElementById('profileView').style.display = 'none';
        document.getElementById('profileView').classList.add('hidden');
        document.getElementById('mainView').style.display = 'block';
    }

    validateFrequencyRange() {
        const minDays = parseInt(document.getElementById('minFrequency').value);
        const maxDays = parseInt(document.getElementById('maxFrequency').value);

        if (minDays >= maxDays) {
            // Auto-adjust max to be at least min + 1
            document.getElementById('maxFrequency').value = minDays + 1;
        }
    }

    loadProfile() {
        // Load saved profile data into form fields
        const fields = ['hairType', 'hairLength', 'shampoo', 'conditioner', 'treatments', 'notes'];

        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element && this.profile[field]) {
                element.value = this.profile[field];
            }
        });

        // Load frequency range
        if (this.profile.minFrequency) {
            document.getElementById('minFrequency').value = this.profile.minFrequency;
        }
        if (this.profile.maxFrequency) {
            document.getElementById('maxFrequency').value = this.profile.maxFrequency;
        }

        // Load checkboxes
        if (this.profile.eventWashReminder !== undefined) {
            document.getElementById('eventWashReminder').checked = this.profile.eventWashReminder;
        }
        if (this.profile.autoScheduleWashes !== undefined) {
            document.getElementById('autoScheduleWashes').checked = this.profile.autoScheduleWashes;
        }

        // Update last wash info with frequency context
        this.updateLastWashInfo();
        this.updateNextWashInfo();
    }

    saveProfile() {
        const fields = ['hairType', 'hairLength', 'shampoo', 'conditioner', 'treatments', 'notes'];

        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                this.profile[field] = element.value;
            }
        });

        // Save frequency range
        this.profile.minFrequency = parseInt(document.getElementById('minFrequency').value);
        this.profile.maxFrequency = parseInt(document.getElementById('maxFrequency').value);

        // Save checkboxes
        this.profile.eventWashReminder = document.getElementById('eventWashReminder').checked;
        this.profile.autoScheduleWashes = document.getElementById('autoScheduleWashes').checked;

        localStorage.setItem('hairProfile', JSON.stringify(this.profile));
        this.showSuccess('✨ Profile saved! Your hair routine is all set! 🛁');
        this.updateLastWashInfo();
        this.updateNextWashInfo();
    }

    smartAutoScheduleWashes() {
        if (!this.profile.minFrequency || !this.profile.maxFrequency) {
            alert('🛁 Please set your wash frequency range in your profile first! Let\'s get your hair routine sorted! ✨');
            return;
        }

        const minDays = parseInt(this.profile.minFrequency);
        const maxDays = parseInt(this.profile.maxFrequency);
        const today = new Date();
        const lastWashDate = this.getLastWashDate();

        // Get all upcoming events to plan around
        const upcomingEvents = this.events.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate > today && event.type === 'event';
        }).sort((a, b) => new Date(a.date) - new Date(b.date));

        let currentDate = lastWashDate ? new Date(lastWashDate) : new Date(today);
        const scheduledWashes = [];

        // Schedule washes for the next 30 days
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + 30);

        while (currentDate < endDate) {
            // Find next wash date within frequency range
            const minNextWash = new Date(currentDate);
            minNextWash.setDate(currentDate.getDate() + minDays);

            const maxNextWash = new Date(currentDate);
            maxNextWash.setDate(currentDate.getDate() + maxDays);

            // Check if there are any events that need pre-wash
            let nextWashDate = null;

            for (const event of upcomingEvents) {
                const eventDate = new Date(event.date);
                const dayBefore = new Date(eventDate);
                dayBefore.setDate(eventDate.getDate() - 1);

                // If event is within our wash window, schedule wash day before
                if (dayBefore >= minNextWash && dayBefore <= maxNextWash) {
                    nextWashDate = dayBefore;
                    break;
                }
            }

            // If no event-driven wash, schedule at max frequency
            if (!nextWashDate) {
                nextWashDate = maxNextWash;
            }

            // Make sure we don't schedule in the past
            if (nextWashDate > today) {
                const dateStr = this.formatDate(nextWashDate);

                // Check if wash is already scheduled
                const existingWash = this.events.find(event =>
                    event.date === dateStr && event.type === 'wash'
                );

                if (!existingWash) {
                    scheduledWashes.push({
                        id: Date.now() + scheduledWashes.length,
                        date: dateStr,
                        name: 'Smart scheduled wash',
                        type: 'wash'
                    });
                }
            }

            currentDate = new Date(nextWashDate);
        }

        // Add all scheduled washes
        this.events.push(...scheduledWashes);

        this.saveData();
        this.renderCalendar();
        this.renderEvents();
        this.showSuccess(`🫧✨ Smart-scheduled ${scheduledWashes.length} washes! Your hair will be fabulous! 💆‍♀️`);
    }

    getLastWashDate() {
        if (this.washDays.length === 0) return null;

        const sortedWashes = [...this.washDays].sort((a, b) => new Date(b) - new Date(a));
        return new Date(sortedWashes[0]);
    }

    updateLastWashInfo() {
        const lastWashText = document.getElementById('lastWashText');

        if (this.washDays.length === 0) {
            lastWashText.textContent = 'Last wash: Never logged';
            return;
        }

        // Sort wash days and get the most recent
        const sortedWashes = [...this.washDays].sort((a, b) => new Date(b) - new Date(a));
        const lastWash = new Date(sortedWashes[0]);
        const today = new Date();

        const daysDiff = Math.floor((today - lastWash) / (1000 * 60 * 60 * 24));

        let message = `Last wash: ${this.formatDisplayDate(sortedWashes[0])}`;

        if (daysDiff === 0) {
            message += ' (Today!)';
        } else if (daysDiff === 1) {
            message += ' (Yesterday)';
        } else if (daysDiff > 1) {
            message += ` (${daysDiff} days ago)`;
        }

        // Add frequency context if profile is set with new range system
        if (this.profile.minFrequency && this.profile.maxFrequency) {
            const minDays = parseInt(this.profile.minFrequency);
            const maxDays = parseInt(this.profile.maxFrequency);

            if (daysDiff >= maxDays) {
                message += ' 🛁✨ Time for a wash! Hair getting gross!';
            } else if (daysDiff >= minDays) {
                message += ' 🫧 Could wash soon, but not urgent yet!';
            } else if (daysDiff < minDays) {
                message += ' ✨ Hair still fresh and clean!';
            }
        }

        lastWashText.textContent = message;
    }

    updateNextWashInfo() {
        const nextWashText = document.getElementById('nextWashText');

        if (!this.profile.minFrequency || !this.profile.maxFrequency) {
            nextWashText.textContent = 'Set your wash frequency range in profile to see smart recommendations! 🛁';
            return;
        }

        const minDays = parseInt(this.profile.minFrequency);
        const maxDays = parseInt(this.profile.maxFrequency);
        const lastWashDate = this.getLastWashDate();

        if (!lastWashDate) {
            nextWashText.textContent = 'Log your first wash to see smart wash recommendations! ✨';
            return;
        }

        const today = new Date();
        const daysSinceWash = Math.floor((today - lastWashDate) / (1000 * 60 * 60 * 24));

        // Calculate recommended wash window
        const minWashDate = new Date(lastWashDate);
        minWashDate.setDate(lastWashDate.getDate() + minDays);

        const maxWashDate = new Date(lastWashDate);
        maxWashDate.setDate(lastWashDate.getDate() + maxDays);

        // Check for upcoming events that might affect timing
        const upcomingEvents = this.events.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate > today && event.type === 'event';
        }).sort((a, b) => new Date(a.date) - new Date(b.date));

        let message = '';

        if (daysSinceWash >= maxDays) {
            message = '🛁✨ Time to wash! Hair is getting gross! 🫧';
        } else if (daysSinceWash >= minDays) {
            // Check if there's an event coming up
            const nextEvent = upcomingEvents[0];
            if (nextEvent) {
                const eventDate = new Date(nextEvent.date);
                const dayBefore = new Date(eventDate);
                dayBefore.setDate(eventDate.getDate() - 1);

                if (dayBefore <= maxWashDate) {
                    message = `💆‍♀️ Wash ${this.formatDisplayDate(this.formatDate(dayBefore))} for ${nextEvent.name}! ✨`;
                } else {
                    message = `🫧 Can wash anytime until ${this.formatDisplayDate(this.formatDate(maxWashDate))} 🗓️`;
                }
            } else {
                message = `🫧 Can wash anytime until ${this.formatDisplayDate(this.formatDate(maxWashDate))} 🗓️`;
            }
        } else {
            const daysUntilMin = Math.ceil((minWashDate - today) / (1000 * 60 * 60 * 24));
            if (daysUntilMin > 0) {
                message = `✨ Hair still fresh! Can wait ${daysUntilMin} more day${daysUntilMin > 1 ? 's' : ''} 🌟`;
            } else {
                message = '🫧 Ready to wash when you want! ✨';
            }
        }

        nextWashText.textContent = message;
    }

    saveData() {
        localStorage.setItem('washDays', JSON.stringify(this.washDays));
        localStorage.setItem('events', JSON.stringify(this.events));
        localStorage.setItem('hairProfile', JSON.stringify(this.profile));
    }
}

// Initialize the app
const tracker = new HairWashTracker();
