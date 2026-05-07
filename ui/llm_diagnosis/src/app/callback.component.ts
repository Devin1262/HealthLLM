import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-callback',
  template: '<div class="loading"><p>Authenticating...</p></div>',
  styles: [`
    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      font-size: 18px;
    }
  `]
})
export class CallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // OAuth callback handling - not used with custom login form
    // If this component is reached, redirect to login
    this.router.navigate(['/login']);
  }
}
