import { Injectable } from '@angular/core';
import { signOut, getCurrentUser} from 'aws-amplify/auth';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private router: Router) {}

  async logout() {
    try {
      // Sign out globally to clear all sessions
      await signOut({ global: true });
      
      // Clear localStorage
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.includes('CognitoIdentityServiceProvider') || 
        key.includes('cognito') ||
        key.includes('amplify')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Redirect to login
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if logout fails
      this.router.navigate(['/login']);
    }
  }

  async getCurrentUsername(): Promise<string> {
    try {
      const user = await getCurrentUser();
      return user.username;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return '';
    }
  }
}
