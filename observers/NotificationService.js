// Observer Pattern (Pub/Sub) - System powiadomień
const nodemailer = require('nodemailer');
const { pool } = require('../config/database');

// Subject - obserwowany obiekt
class NotificationSubject {
  constructor() {
    this.observers = [];
  }

  attach(observer) {
    this.observers.push(observer);
  }

  detach(observer) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  async notify(event) {
    for (const observer of this.observers) {
      await observer.update(event);
    }
  }
}

// Observer Interface
class NotificationObserver {
  async update(event) {
    throw new Error('Method update() must be implemented');
  }
}

// Concrete Observer - Email Notifier
class EmailNotificationObserver extends NotificationObserver {
  constructor(transporter) {
    super();
    this.transporter = transporter;
  }

  async update(event) {
    const { type, data } = event;

    let mailOptions;

    switch(type) {
      case 'due_reminder':
        mailOptions = this.createDueReminderEmail(data);
        break;
      case 'overdue':
        mailOptions = this.createOverdueEmail(data);
        break;
      case 'book_available':
        mailOptions = this.createAvailabilityEmail(data);
        break;
      case 'loan_created':
        mailOptions = this.createLoanConfirmationEmail(data);
        break;
      default:
        return;
    }

    try {
      await this.transporter.sendMail(mailOptions);
      await this.logNotification(data.userId, type, mailOptions);
      console.log(`Email sent: ${type} to ${data.email}`);
    } catch (error) {
      console.error(`Failed to send email: ${error.message}`);
    }
  }

  createDueReminderEmail(data) {
    return {
      from: process.env.EMAIL_USER,
      to: data.email,
      subject: 'Przypomnienie o zbliżającym się terminie zwrotu',
      html: `
        <h2>Witaj ${data.firstName}!</h2>
        <p>Przypominamy, że termin zwrotu książki <strong>${data.title}</strong> upływa jutro.</p>
        <p><strong>Data zwrotu:</strong> ${new Date(data.dueDate).toLocaleDateString('pl-PL')}</p>
        <p>Prosimy o terminowy zwrot lub przedłużenie wypożyczenia w systemie.</p>
        <hr>
        <p><small>Wiadomość wygenerowana automatycznie przez System Biblioteki.</small></p>
      `
    };
  }

  createOverdueEmail(data) {
    return {
      from: process.env.EMAIL_USER,
      to: data.email,
      subject: 'Książka nie została zwrócona w terminie',
      html: `
        <h2>Witaj ${data.firstName}!</h2>
        <p>Książka <strong>${data.title}</strong> nie została zwrócona w terminie.</p>
        <p><strong>Termin zwrotu był:</strong> ${new Date(data.dueDate).toLocaleDateString('pl-PL')}</p>
        <p>Prosimy o pilny zwrot książki do biblioteki.</p>
        <hr>
        <p><small>Wiadomość wygenerowana automatycznie przez System Biblioteki.</small></p>
      `
    };
  }

  createAvailabilityEmail(data) {
    return {
      from: process.env.EMAIL_USER,
      to: data.email,
      subject: 'Zarezerwowana książka jest dostępna',
      html: `
        <h2>Witaj ${data.firstName}!</h2>
        <p>Zarezerwowana przez Ciebie książka <strong>${data.title}</strong> jest już dostępna!</p>
        <p>Możesz ją odebrać w bibliotece w ciągu 7 dni.</p>
        <hr>
        <p><small>Wiadomość wygenerowana automatycznie przez System Biblioteki.</small></p>
      `
    };
  }

  createLoanConfirmationEmail(data) {
    return {
      from: process.env.EMAIL_USER,
      to: data.email,
      subject: 'Potwierdzenie wypożyczenia książki',
      html: `
        <h2>Witaj ${data.firstName}!</h2>
        <p>Potwierdzamy wypożyczenie książki <strong>${data.title}</strong>.</p>
        <p><strong>Data wypożyczenia:</strong> ${new Date(data.loanDate).toLocaleDateString('pl-PL')}</p>
        <p><strong>Termin zwrotu:</strong> ${new Date(data.dueDate).toLocaleDateString('pl-PL')}</p>
        <p>Życzymy miłej lektury!</p>
        <hr>
        <p><small>Wiadomość wygenerowana automatycznie przez System Biblioteki.</small></p>
      `
    };
  }

  async logNotification(userId, type, mailOptions) {
    try {
      await pool.query(
        `INSERT INTO email_notifications (user_id, type, subject, body, sent_at, status) 
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'sent')`,
        [userId, type, mailOptions.subject, mailOptions.html]
      );
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }
}

// Concrete Observer - SMS Notifier (przykład, nie wysyła prawdziwych SMS)
class SMSNotificationObserver extends NotificationObserver {
  async update(event) {
    const { type, data } = event;
    console.log(`[SMS] ${type} notification to ${data.phone || 'N/A'}: ${data.title || data.message}`);
    // Tutaj byłaby integracja z API do wysyłania SMS
  }
}

// Service zarządzający powiadomieniami
class NotificationService {
  constructor() {
    this.subject = new NotificationSubject();
    this.setupObservers();
  }

  setupObservers() {
    // Konfiguracja email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Rejestracja obserwatorów
    this.subject.attach(new EmailNotificationObserver(transporter));
    this.subject.attach(new SMSNotificationObserver());
  }

  async sendDueReminder(loanData) {
    await this.subject.notify({
      type: 'due_reminder',
      data: loanData
    });
  }

  async sendOverdueNotification(loanData) {
    await this.subject.notify({
      type: 'overdue',
      data: loanData
    });
  }

  async sendBookAvailableNotification(reservationData) {
    await this.subject.notify({
      type: 'book_available',
      data: reservationData
    });
  }

  async sendLoanConfirmation(loanData) {
    await this.subject.notify({
      type: 'loan_created',
      data: loanData
    });
  }
}

module.exports = new NotificationService();