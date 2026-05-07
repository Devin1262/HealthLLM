import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, FormsModule],
      providers: [{ provide: Router, useValue: mockRouter }]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the login component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize username and password as empty strings', () => {
    expect(component.username).toBe('');
    expect(component.password).toBe('');
  });

  it('should initialize isLoading as false', () => {
    expect(component.isLoading).toBe(false);
  });

  it('should display the login form', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('form')).toBeTruthy();
  });

  it('should have username input field', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[id="username"]');
    expect(input).toBeTruthy();
  });

  it('should have password input field', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[id="password"]');
    expect(input).toBeTruthy();
  });

  it('should have a sign in button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('button[type="submit"]');
    expect(button).toBeTruthy();
  });

  it('should bind username input to component property', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[id="username"]') as HTMLInputElement;
    input.value = 'testuser';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.username).toBe('testuser');
  });

  it('should bind password input to component property', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[id="password"]') as HTMLInputElement;
    input.value = 'testpassword';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.password).toBe('testpassword');
  });

  it('should display error message when errorMessage is set', () => {
    component.errorMessage = 'Invalid credentials';
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const errorElement = compiled.querySelector('.error-message');
    expect(errorElement?.textContent).toContain('Invalid credentials');
  });

  it('should call onLogin when form is submitted', () => {
    spyOn(component, 'onLogin');
    const form = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    expect(component.onLogin).toHaveBeenCalled();
  });

  it('should disable login button when isLoading is true', () => {
    component.isLoading = true;
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('should display "Signing in..." text when isLoading is true', () => {
    component.isLoading = true;
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button?.textContent).toContain('Signing in...');
  });

  it('should display "Sign in" text when isLoading is false', () => {
    component.isLoading = false;
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button?.textContent).toContain('Sign in');
  });
});
