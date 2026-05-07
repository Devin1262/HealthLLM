import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatbotComponent } from './chatbot.component';
import { AuthService } from './services/auth.service';

describe('ChatbotComponent', () => {
  let component: ChatbotComponent;
  let fixture: ComponentFixture<ChatbotComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['logout']);

    await TestBed.configureTestingModule({
      imports: [ChatbotComponent, FormsModule],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ChatbotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the chatbot component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize messages with sample data', () => {
    expect(component.messages.length).toBeGreaterThan(0);
  });

  it('should initialize userInput as empty string', () => {
    expect(component.userInput).toBe('');
  });

  it('should display the chat container', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.chat-container')).toBeTruthy();
  });

  it('should have chat header with title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const header = compiled.querySelector('.chat-header h1');
    expect(header?.textContent).toContain('AI Medical Chatbot');
  });

  it('should display input form', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.input-form')).toBeTruthy();
  });

  it('should have input field for user message', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('.input-form input');
    expect(input).toBeTruthy();
  });

  it('should have send button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('.input-form button');
    expect(button?.textContent).toContain('Send');
  });

  it('should disable send button when input is empty', () => {
    component.userInput = '';
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.input-form button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('should enable send button when input has text', () => {
    component.userInput = 'Hello';
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.input-form button') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it('should display messages in chat window', () => {
    component.messages = [
      { id: '1', sender: 'user', content: 'Hello', timestamp: new Date() },
      { id: '2', sender: 'ai', content: 'Hi there', timestamp: new Date() }
    ];
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const messageBubbles = compiled.querySelectorAll('.message');
    expect(messageBubbles.length).toBe(2);
  });

  it('should display user message with correct styling', () => {
    component.messages = [
      { id: '1', sender: 'user', content: 'Test message', timestamp: new Date() }
    ];
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const message = compiled.querySelector('.message.user');
    expect(message).toBeTruthy();
  });

  it('should display ai message with correct styling', () => {
    component.messages = [
      { id: '1', sender: 'ai', content: 'Test response', timestamp: new Date() }
    ];
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const message = compiled.querySelector('.message.ai');
    expect(message).toBeTruthy();
  });

  it('should display message content', () => {
    component.messages = [
      { id: '1', sender: 'user', content: 'Hello AI', timestamp: new Date() }
    ];
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.querySelector('.message-content');
    expect(content?.textContent).toContain('Hello AI');
  });

  it('should display "You" for user messages', () => {
    component.messages = [
      { id: '1', sender: 'user', content: 'Hello', timestamp: new Date() }
    ];
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const sender = compiled.querySelector('.message.user .message-sender');
    expect(sender?.textContent).toContain('You');
  });

  it('should display "AI Assistant" for ai messages', () => {
    component.messages = [
      { id: '1', sender: 'ai', content: 'Hi', timestamp: new Date() }
    ];
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const sender = compiled.querySelector('.message.ai .message-sender');
    expect(sender?.textContent).toContain('AI Assistant');
  });

  it('should call sendMessage when form is submitted', () => {
    spyOn(component, 'sendMessage');
    const form = fixture.nativeElement.querySelector('.input-form');
    form.dispatchEvent(new Event('submit'));
    expect(component.sendMessage).toHaveBeenCalled();
  });

  it('should have navbar with navigation buttons', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const navbar = compiled.querySelector('.navbar');
    expect(navbar).toBeTruthy();
  });

  it('should have Input Data navigation button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(compiled.querySelectorAll('.nav-btn'));
    const inputDataBtn = buttons.find(btn => btn.textContent?.includes('Input Data'));
    expect(inputDataBtn).toBeTruthy();
  });

  it('should have logout button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(compiled.querySelectorAll('.nav-btn'));
    const logoutBtn = buttons.find(btn => btn.textContent?.includes('Logout'));
    expect(logoutBtn).toBeTruthy();
  });
});
