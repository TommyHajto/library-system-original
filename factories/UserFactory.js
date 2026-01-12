// Factory Pattern - Tworzenie różnych typów użytkowników
const bcrypt = require('bcrypt');

class User {
  constructor(data) {
    this.userId = data.user_id;
    this.email = data.email;
    this.firstName = data.first_name;
    this.lastName = data.last_name;
    this.phone = data.phone;
    this.address = data.address;
    this.role = data.role;
    this.isActive = data.is_active;
    this.createdAt = data.created_at;
  }

  getFullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  toJSON() {
    return {
      userId: this.userId,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      phone: this.phone,
      address: this.address,
      role: this.role,
      isActive: this.isActive,
      createdAt: this.createdAt
    };
  }
}

class Reader extends User {
  constructor(data) {
    super(data);
    this.maxLoans = 5;
    this.loanDuration = 14; // dni
  }

  canBorrow() {
    return this.isActive;
  }

  getPermissions() {
    return ['view_catalog', 'borrow_books', 'reserve_books', 'view_history'];
  }
}

class Librarian extends User {
  constructor(data) {
    super(data);
    this.canManageLoans = true;
    this.canManageBooks = true;
  }

  canBorrow() {
    return this.isActive;
  }

  getPermissions() {
    return [
      'view_catalog', 'borrow_books', 'reserve_books', 'view_history',
      'manage_loans', 'manage_books', 'manage_readers', 'view_reports'
    ];
  }
}

class Admin extends User {
  constructor(data) {
    super(data);
    this.canManageUsers = true;
    this.canManageSystem = true;
  }

  canBorrow() {
    return this.isActive;
  }

  getPermissions() {
    return [
      'view_catalog', 'borrow_books', 'reserve_books', 'view_history',
      'manage_loans', 'manage_books', 'manage_readers', 'view_reports',
      'manage_users', 'manage_system', 'change_roles', 'view_all_data'
    ];
  }
}

class UserFactory {
  static async createUser(userData, plainPassword) {
    const passwordHash = await bcrypt.hash(plainPassword, 10);
    
    return {
      email: userData.email,
      passwordHash: passwordHash,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone || null,
      address: userData.address || null,
      role: userData.role || 'reader'
    };
  }

  static createUserInstance(userData) {
    switch(userData.role) {
      case 'reader':
        return new Reader(userData);
      case 'librarian':
        return new Librarian(userData);
      case 'admin':
        return new Admin(userData);
      default:
        return new Reader(userData);
    }
  }

  static createReader(userData) {
    return new Reader({ ...userData, role: 'reader' });
  }

  static createLibrarian(userData) {
    return new Librarian({ ...userData, role: 'librarian' });
  }

  static createAdmin(userData) {
    return new Admin({ ...userData, role: 'admin' });
  }
}

module.exports = { UserFactory, Reader, Librarian, Admin };