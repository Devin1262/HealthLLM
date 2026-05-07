import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ViewMedicalDataComponent } from './view-medical-data.component';
import { AuthService } from './services/auth.service';

describe('ViewMedicalDataComponent', () => {
  let component: ViewMedicalDataComponent;
  let fixture: ComponentFixture<ViewMedicalDataComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['logout']);

    await TestBed.configureTestingModule({
      imports: [ViewMedicalDataComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ViewMedicalDataComponent);
    component = fixture.componentInstance;

    // mock data
    component.patientData = {
      name: 'John Doe',
      age: 45,
      gender: 'Male',
      last_consultation: '2026-03-20',
      chief_symptom: 'headaches',
      other_symptoms: ['nausea', 'light sensitivity'],
      medications: ['Aspirin'],
      allergies: ['Penicillin'],
      conditions: ['Hypertension'],
      vitals: {
        temperature: '98.6',
        blood_pressure: '130/85',
        heart_rate: '72',
        blood_oxygen: '98'
      }
    };
    
    fixture.detectChanges();
  });

  it('should create the view medical data component', () => {
    expect(component).toBeTruthy();
  });

  it('should display page header', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const header = compiled.querySelector('.page-header h1');
    expect(header?.textContent).toContain('Current Medical Data');
  });

  it('should display data container', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.data-container')).toBeTruthy();
  });

  it('should have Patient Information card', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = Array.from(compiled.querySelectorAll('.data-card h3'));
    const patientCard = cards.find(card => card.textContent?.includes('Patient Information'));
    expect(patientCard).toBeTruthy();
  });

  it('should have Current Symptoms card', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = Array.from(compiled.querySelectorAll('.data-card h3'));
    const symptomsCard = cards.find(card => card.textContent?.includes('Current Symptoms'));
    expect(symptomsCard).toBeTruthy();
  });

  it('should display patient name', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const name = Array.from(compiled.querySelectorAll('.data-item .value'));
    const patientName = name.find(n => n.textContent?.includes('John Doe'));
    expect(patientName).toBeTruthy();
  });

  it('should display patient age', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const values = Array.from(compiled.querySelectorAll('.data-item .value'));
    const age = values.find(v => v.textContent?.includes('45'));
    expect(age).toBeTruthy();
  });

  it('should display patient gender', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const values = Array.from(compiled.querySelectorAll('.data-item .value'));
    const gender = values.find(v => v.textContent?.includes('Male'));
    expect(gender).toBeTruthy();
  });

  it('should display last consultation date', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const values = Array.from(compiled.querySelectorAll('.data-item .value'));
    const consultDate = values.find(v => v.textContent?.includes('March 20'));
    expect(consultDate).toBeTruthy();
  });

  it('should display chief complaint', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const values = Array.from(compiled.querySelectorAll('.data-item .value'));
    const complaint = values.find(v => v.textContent?.includes('headaches'));
    expect(complaint).toBeTruthy();
  });

  it('should display data labels', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const labels = compiled.querySelectorAll('.data-item .label');
    expect(labels.length).toBeGreaterThan(0);
  });

  it('should have navbar', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.navbar')).toBeTruthy();
  });

  it('should display Medical Diagnosis AI title in navbar', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('.navbar h2');
    expect(title?.textContent).toContain('Medical Diagnosis AI');
  });

  it('should have Input Data navigation button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(compiled.querySelectorAll('.nav-btn'));
    const inputDataBtn = buttons.find(btn => btn.textContent?.includes('Input Data'));
    expect(inputDataBtn).toBeTruthy();
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

  it('should have View Data button marked as active', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(compiled.querySelectorAll('.nav-btn'));
    const viewDataBtn = buttons.find(btn => btn.textContent?.includes('View Data'));
    expect(viewDataBtn?.classList.contains('active')).toBe(true);
  });

  it('should render data cards with data-card class', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.data-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('should format data in grid layout', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const grid = compiled.querySelector('.data-grid');
    expect(grid).toBeTruthy();
  });

  it('should display multiple data items', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const items = compiled.querySelectorAll('.data-item');
    expect(items.length).toBeGreaterThan(0);
  });

  it('should call navigate method on Input Data button click', () => {
    spyOn(component, 'navigate');
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(compiled.querySelectorAll('.nav-btn')) as HTMLButtonElement[];
    const inputDataBtn = buttons.find(btn => btn.textContent?.includes('Input Data'));
    inputDataBtn?.click();
    expect(component.navigate).toHaveBeenCalled();
  });

  it('should call logout method on Logout button click', () => {
    spyOn(component, 'logout');
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(compiled.querySelectorAll('.nav-btn')) as HTMLButtonElement[];
    const logoutBtn = buttons.find(btn => btn.textContent?.includes('Logout'));
    logoutBtn?.click();
    expect(component.logout).toHaveBeenCalled();
  });
});
