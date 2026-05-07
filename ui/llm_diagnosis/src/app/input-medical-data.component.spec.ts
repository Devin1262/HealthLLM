import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputMedicalDataComponent } from './input-medical-data.component';
import { AuthService } from './services/auth.service';

describe('InputMedicalDataComponent', () => {
  let component: InputMedicalDataComponent;
  let fixture: ComponentFixture<InputMedicalDataComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['logout']);

    await TestBed.configureTestingModule({
      imports: [InputMedicalDataComponent, FormsModule],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InputMedicalDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the input medical data component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize formData object', () => {
    expect(component.formData).toBeDefined();
  });

  it('should initialize patientName with default value', () => {
    expect(component.formData.patientName).toBe('John Doe');
  });

  it('should initialize age with default value', () => {
    expect(component.formData.age).toBe(45);
  });

  it('should initialize gender with default value', () => {
    expect(component.formData.gender).toBe('Male');
  });

  it('should display page header', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const header = compiled.querySelector('.page-header h1');
    expect(header?.textContent).toContain('Enter New Medical Data');
  });

  it('should display medical form', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.medical-form')).toBeTruthy();
  });

  it('should have Personal Information section', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const sections = Array.from(compiled.querySelectorAll('.form-section h3'));
    const personalSection = sections.find(s => s.textContent?.includes('Personal Information'));
    expect(personalSection).toBeTruthy();
  });

  it('should have Symptoms section', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const sections = Array.from(compiled.querySelectorAll('.form-section h3'));
    const symptomsSection = sections.find(s => s.textContent?.includes('Symptoms'));
    expect(symptomsSection).toBeTruthy();
  });

  it('should have patient name input field', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[name="patientName"]');
    expect(input).toBeTruthy();
  });

  it('should have age input field', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[name="age"]');
    expect(input).toBeTruthy();
  });

  it('should have gender select field', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const select = compiled.querySelector('select[name="gender"]');
    expect(select).toBeTruthy();
  });

  it('should have consultation date input field', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[name="consultationDate"]');
    expect(input).toBeTruthy();
  });

  it('should have gender options', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const options = compiled.querySelectorAll('select[name="gender"] option');
    expect(options.length).toBeGreaterThan(1);
  });

  it('should have Male gender option', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const options = Array.from(compiled.querySelectorAll('select[name="gender"] option'));
    const maleOption = options.find(opt => opt.textContent?.includes('Male'));
    expect(maleOption).toBeTruthy();
  });

  it('should have Female gender option', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const options = Array.from(compiled.querySelectorAll('select[name="gender"] option'));
    const femaleOption = options.find(opt => opt.textContent?.includes('Female'));
    expect(femaleOption).toBeTruthy();
  });

  it('should have chief complaint textarea', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const textarea = compiled.querySelector('textarea[name="chiefComplaint"]');
    expect(textarea).toBeTruthy();
  });

  it('should have symptom duration input field', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[name="symptomDuration"]');
    expect(input).toBeTruthy();
  });

  it('should have additional symptoms textarea', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const textarea = compiled.querySelector('textarea[name="additionalSymptoms"]');
    expect(textarea).toBeTruthy();
  });

  it('should bind patient name to formData', () => {
    component.formData.patientName = 'John Smith';
    fixture.detectChanges();
    expect(component.formData.patientName).toBe('John Smith');
  });

  it('should bind age to formData', () => {
    component.formData.age = 45;
    fixture.detectChanges();
    expect(component.formData.age).toBe(45);
  });

  it('should bind gender to formData', () => {
    component.formData.gender = 'Male';
    fixture.detectChanges();
    expect(component.formData.gender).toBe('Male');
  });

  it('should have submit button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('button[type="submit"]');
    expect(button).toBeTruthy();
  });

  it('should call onSubmit when form is submitted', () => {
    spyOn(component, 'onSubmit');
    const form = fixture.nativeElement.querySelector('.medical-form');
    form.dispatchEvent(new Event('submit'));
    expect(component.onSubmit).toHaveBeenCalled();
  });

  it('should have navbar with navigation links', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const navbar = compiled.querySelector('.navbar');
    expect(navbar).toBeTruthy();
  });

  it('should have View Data navigation button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(compiled.querySelectorAll('.nav-btn'));
    const viewDataBtn = buttons.find(btn => btn.textContent?.includes('View Data'));
    expect(viewDataBtn).toBeTruthy();
  });

  it('should have Chatbot navigation button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(compiled.querySelectorAll('.nav-btn'));
    const chatbotBtn = buttons.find(btn => btn.textContent?.includes('Chatbot'));
    expect(chatbotBtn).toBeTruthy();
  });

  it('should have logout button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(compiled.querySelectorAll('.nav-btn'));
    const logoutBtn = buttons.find(btn => btn.textContent?.includes('Logout'));
    expect(logoutBtn).toBeTruthy();
  });
});
