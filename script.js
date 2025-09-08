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
        document.getElementById('toggleProfile').addEventListener('click', () => {
            this.toggleProfile();
        });

        document.getElementById('saveProfile').addEventListener('click', () => {
            this.saveProfile();
        });

        document.getElementById('autoSchedule').addEventListener('click', () => {
            this.autoScheduleWashes();
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

        // If it's an important event, suggest washing hair the day before
        if (event.type === 'event') {
            const eventDate = new Date(event.date);
            const dayBefore = new Date(eventDate);
            dayBefore.setDate(dayBefore.getDate() - 1);

            if (confirm(`Would you like to schedule a hair wash for ${this.formatDate(dayBefore)} (day before ${event.name})?`)) {
                this.events.push({
                    id: Date.now() + 1,
                    date: this.formatDate(dayBefore),
                    name: `Wash hair for ${event.name}`,
                    type: 'wash'
                });
                this.saveData();
                this.renderCalendar();
                this.renderEvents();
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
            header.style.padding = '10px';
            header.style.textAlign = 'center';
            header.style.background = '#f8f9fa';
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

    toggleProfile() {
        const profileContent = document.getElementById('profileContent');
        const toggleBtn = document.getElementById('toggleProfile');

        if (profileContent.classList.contains('hidden')) {
            profileContent.classList.remove('hidden');
            toggleBtn.textContent = '🫧';
        } else {
            profileContent.classList.add('hidden');
            toggleBtn.textContent = '🛁';
        }
    }

    loadProfile() {
        // Load saved profile data into form fields
        const fields = ['hairType', 'hairLength', 'washFrequency', 'shampoo', 'conditioner', 'treatments', 'notes'];

        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element && this.profile[field]) {
                element.value = this.profile[field];
            }
        });

        // Update last wash info with frequency context
        this.updateLastWashInfo();
        this.updateNextWashInfo();
    }

    saveProfile() {
        const fields = ['hairType', 'hairLength', 'washFrequency', 'shampoo', 'conditioner', 'treatments', 'notes'];

        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                this.profile[field] = element.value;
            }
        });

        localStorage.setItem('hairProfile', JSON.stringify(this.profile));
        this.showSuccess('✨ Profile saved! Your hair routine is all set! 🛁');
        this.updateLastWashInfo();
        this.updateNextWashInfo();
    }

    autoScheduleWashes() {
        if (!this.profile.washFrequency) {
            alert('🛁 Please set your preferred wash frequency in your profile first! Let\'s get your hair routine sorted! ✨');
            return;
        }

        const frequency = parseInt(this.profile.washFrequency);
        const today = new Date();
        const lastWashDate = this.getLastWashDate();

        let nextWashDate;
        if (lastWashDate) {
            nextWashDate = new Date(lastWashDate);
            nextWashDate.setDate(nextWashDate.getDate() + frequency);
        } else {
            nextWashDate = new Date(today);
            nextWashDate.setDate(today.getDate() + 1);
        }

        // Schedule next 4 washes
        for (let i = 0; i < 4; i++) {
            const washDate = new Date(nextWashDate);
            washDate.setDate(nextWashDate.getDate() + (frequency * i));

            const dateStr = this.formatDate(washDate);

            // Check if wash is already scheduled
            const existingWash = this.events.find(event =>
                event.date === dateStr && event.type === 'wash'
            );

            if (!existingWash && washDate > today) {
                this.events.push({
                    id: Date.now() + i,
                    date: dateStr,
                    name: 'Scheduled hair wash',
                    type: 'wash'
                });
            }
        }

        this.saveData();
        this.renderCalendar();
        this.renderEvents();
        this.showSuccess('🫧✨ Washes auto-scheduled! Your hair will be fabulous! 💆‍♀️');
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

        // Add frequency context if profile is set
        if (this.profile.washFrequency) {
            const frequency = parseInt(this.profile.washFrequency);
            if (daysDiff >= frequency) {
                message += ' 🛁✨ Time for a bubbly wash!';
            } else if (daysDiff === frequency - 1) {
                message += ' 🫧 Wash tomorrow? Get ready to sparkle!';
            }
        }

        lastWashText.textContent = message;
    }

    updateNextWashInfo() {
        const nextWashText = document.getElementById('nextWashText');

        if (!this.profile.washFrequency) {
            nextWashText.textContent = 'Set your wash frequency in profile to see next wash reminder! 🛁';
            return;
        }

        const frequency = parseInt(this.profile.washFrequency);
        const lastWashDate = this.getLastWashDate();

        if (!lastWashDate) {
            nextWashText.textContent = 'Log your first wash to see next wash reminder! ✨';
            return;
        }

        // Calculate next wash date
        const nextWashDate = new Date(lastWashDate);
        nextWashDate.setDate(nextWashDate.getDate() + frequency);

        const today = new Date();
        const daysDiff = Math.floor((nextWashDate - today) / (1000 * 60 * 60 * 24));

        let message = `Next hair wash: ${this.formatDisplayDate(this.formatDate(nextWashDate))}`;

        if (daysDiff < 0) {
            message = '🛁✨ Time for a wash! You\'re overdue for some bubbly self-care! 🫧';
        } else if (daysDiff === 0) {
            message = '🫧 Hair wash day is today! Time to get sudsy! ✨';
        } else if (daysDiff === 1) {
            message = '💆‍♀️ Hair wash tomorrow! Get ready to sparkle! ✨';
        } else {
            message += ` (in ${daysDiff} days) 🗓️`;
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