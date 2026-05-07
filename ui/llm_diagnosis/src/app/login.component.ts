import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { signIn, signOut } from 'aws-amplify/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h1>Medical Diagnosis AI</h1>
        <p class="subtitle">Login to your account</p>
        
        <form (ngSubmit)="onLogin()">
          <div class="form-group">
            <label for="username">Username</label>
            <input 
              type="text" 
              id="username" 
              [(ngModel)]="username" 
              name="username"
              placeholder="Enter your username"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              [(ngModel)]="password" 
              name="password"
              placeholder="Enter your password"
              required
            />
          </div>
          
          <div *ngIf="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>
          
          <button type="submit" class="login-btn" [disabled]="isLoading">
            {{ isLoading ? 'Signing in...' : 'Sign in' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: #1a1a2e;
    }
    
    .login-card {
      background: #252540;
      padding: 40px;
      border-radius: 10px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      width: 100%;
      max-width: 400px;
      border: 1px solid #3a3a50;
    }
    
    h1 {
      text-align: center;
      color: #e0e0e0;
      margin: 0 0 10px 0;
      font-size: 28px;
    }
    
    .subtitle {
      text-align: center;
      color: #b0b0b0;
      margin: 0 0 30px 0;
      font-size: 14px;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    label {
      display: block;
      margin-bottom: 8px;
      color: #e0e0e0;
      font-weight: 500;
      font-size: 14px;
    }
    
    input {
      width: 100%;
      padding: 12px;
      border: 1px solid #3a3a50;
      border-radius: 5px;
      font-size: 14px;
      box-sizing: border-box;
      transition: border-color 0.3s;
      background-color: #1a1a2e;
      color: #e0e0e0;
    }
    
    input:focus {
      outline: none;
      border-color: #9d4edd;
      box-shadow: 0 0 5px rgba(157, 78, 221, 0.2);
    }
    
    .error-message {
      color: #ff6b6b;
      font-size: 12px;
      margin-bottom: 15px;
      padding: 10px;
      background: rgba(255, 107, 107, 0.1);
      border-radius: 4px;
      border-left: 3px solid #ff6b6b;
    }
    
    .login-btn {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 5px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }
    
    .login-btn:hover:not(:disabled) {
      transform: translateY(-2px);
    }
    
    .login-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  isLoading = false;
  errorMessage = '';

  constructor(private router: Router) {}

  ngOnInit() {
    // Auto-redirect if already logged in
    this.checkAuth();
  }

  private async checkAuth() {
    try {
      const user = await (window as any).amplifyUser;
      if (user) {
        this.router.navigate(['/view-data']);
      }
    } catch (error) {
      // Not logged in, stay on login page
    }
  }

  async onLogin() {
    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter username and password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const result = await signIn({
        username: this.username,
        password: this.password
      });

      if (result.isSignedIn) {
        this.router.navigate(['/view-data']);
      }
    } catch (error: any) {
      console.error('Sign in error:', error);

      // If user is already signed in, force logout first
      if (error.message && error.message.includes('already a signed in user')) {
        try {
          await signOut({ global: true });
          // Clear all auth-related localStorage
          Object.keys(localStorage)
            .filter(key => key.includes('CognitoIdentityServiceProvider') || key.includes('cognito') || key.includes('amplify'))
            .forEach(key => localStorage.removeItem(key));
          
          this.errorMessage = 'Session cleared. Please try logging in again.';
          this.username = '';
          this.password = '';
        } catch (signOutError) {
          console.error('Force sign out failed:', signOutError);
          this.errorMessage = 'Please refresh the page and try again.';
        }
      } else {
        this.errorMessage = error.message || 'Login failed. Please check your credentials.';
      }
    } finally {
      this.isLoading = false;
    }
  }
}

