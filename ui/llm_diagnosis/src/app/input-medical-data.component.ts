import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './services/auth.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-input-medical-data',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <nav class="navbar">
        <h2>Medical Diagnosis AI</h2>
        <div class="nav-links">
          <button (click)="navigate('/input-data')" class="nav-btn active">Input Data</button>
          <button (click)="navigate('/view-data')" class="nav-btn">View Data</button>
          <button (click)="navigate('/chatbot')" class="nav-btn">Chatbot</button>
          <button (click)="navigate('/alerts')" class="nav-btn">Alerts</button>
          <button (click)="logout()" class="nav-btn logout">Logout</button>
        </div>
      </nav>
      
      <div class="content" *ngIf="patientData && patientData.id">
        <div class="page-header">
          <h1>Update Medical Data</h1>
          <p>Edit patient information and update to HealthLake</p>
        </div>
        
        <div class="data-container">
          <div class="data-card">
            <h3>Patient Information</h3>
            <div class="data-grid">
              <div class="data-item">
                <span class="label">Patient Name:</span>
                <span class="value">{{ cleanPatientName(patientData?.name) }}</span>
              </div>
              <div class="data-item">
                <span class="label">Age:</span>
                <span class="value">{{ patientData?.age }}</span>
              </div>
              <div class="data-item">
                <span class="label">Gender:</span>
                <span class="value">{{ patientData?.gender }}</span>
              </div>
              <div class="data-item">
                <span class="label">Last Consultation:</span>
                <span class="value">{{ patientData?.last_consultation | date }}</span>
              </div>
            </div>
          </div>
          
          <div class="data-card editable-card">
            <h3>Current Symptoms</h3>
            <p class="section-hint">Edit your symptoms below and save to update HealthLake</p>
            <div class="conditions-list">
              <div class="condition-item" *ngFor="let symptom of editableSymptoms; let i = index">
                <div class="condition-input-group">
                  <input 
                    type="text" 
                    [(ngModel)]="editableSymptoms[i]" 
                    [ngModelOptions]="{updateOn: 'blur'}"
                    class="condition-input"
                    placeholder="Enter symptom"
                  />
                  <button type="button" (click)="removeSymptom(i)" class="btn-remove">Remove</button>
                </div>
              </div>
            </div>
            <div class="add-condition">
              <input 
                type="text" 
                [(ngModel)]="newSymptom" 
                placeholder="Add new symptom"
                (keyup.enter)="addSymptom()"
                class="condition-input"
              />
              <button type="button" (click)="addSymptom()" class="btn-add">Add Symptom</button>
            </div>
            <button (click)="saveSymptoms()" class="btn-save-conditions" [disabled]="isSavingSymptoms">
              {{ isSavingSymptoms ? 'Saving...' : 'Save Symptoms to HealthLake' }}
            </button>
            <div *ngIf="symptomSaveMessage" class="message" [ngClass]="symptomSaveMessage.type">
              {{ symptomSaveMessage.text }}
            </div>
          </div>
          
          <div class="data-card">
            <h3>Medical History</h3>
            <div class="data-item full editable-section">
              <span class="label">Current Medications:</span>
              <p class="section-hint">Edit your medications below and save to update HealthLake</p>
              <div class="conditions-list">
                <div class="condition-item" *ngFor="let medication of editableMedications; let i = index">
                  <div class="condition-input-group">
                    <input 
                      type="text" 
                      [(ngModel)]="medication.display" 
                      [ngModelOptions]="{updateOn: 'blur'}"
                      class="condition-input"
                      placeholder="Enter medication name"
                      [disabled]="!!medication.id"
                    />
                    <button type="button" (click)="removeMedication(i)" class="btn-remove">
                      {{ medication.id ? 'Delete' : 'Remove' }}
                    </button>
                  </div>
                </div>
              </div>
              <div class="add-condition">
                <input 
                  type="text" 
                  [(ngModel)]="newMedication" 
                  placeholder="Add new medication"
                  (keyup.enter)="addMedication()"
                  class="condition-input"
                />
                <button type="button" (click)="addMedication()" class="btn-add">Add Medication</button>
              </div>
              <button (click)="saveMedications()" class="btn-save-conditions" [disabled]="isSavingMedications">
                {{ isSavingMedications ? 'Saving...' : 'Save Medications to HealthLake' }}
              </button>
              <div *ngIf="medicationSaveMessage" class="message" [ngClass]="medicationSaveMessage.type">
                {{ medicationSaveMessage.text }}
              </div>
            </div>
            
            <div class="data-item full editable-section">
              <span class="label">Known Allergies:</span>
              <p class="section-hint">Edit your allergies below and save to update HealthLake</p>
              <div class="conditions-list">
                <div class="condition-item" *ngFor="let allergy of editableAllergies; let i = index">
                  <div class="condition-input-group">
                    <input 
                      type="text" 
                      [(ngModel)]="allergy.display" 
                      [ngModelOptions]="{updateOn: 'blur'}"
                      class="condition-input"
                      placeholder="Enter allergy name"
                      [disabled]="!!allergy.id"
                    />
                    <button type="button" (click)="removeAllergy(i)" class="btn-remove">
                      {{ allergy.id ? 'Delete' : 'Remove' }}
                    </button>
                  </div>
                </div>
              </div>
              <div class="add-condition">
                <input 
                  type="text" 
                  [(ngModel)]="newAllergy" 
                  placeholder="Add new allergy"
                  (keyup.enter)="addAllergy()"
                  class="condition-input"
                />
                <button type="button" (click)="addAllergy()" class="btn-add">Add Allergy</button>
              </div>
              <button (click)="saveAllergies()" class="btn-save-conditions" [disabled]="isSavingAllergies">
                {{ isSavingAllergies ? 'Saving...' : 'Save Allergies to HealthLake' }}
              </button>
              <div *ngIf="allergySaveMessage" class="message" [ngClass]="allergySaveMessage.type">
                {{ allergySaveMessage.text }}
              </div>
            </div>
          </div>
          
          <div class="data-card editable-card">
            <h3>Medical Conditions</h3>
            <p class="section-hint">Edit your medical conditions below and save to update HealthLake</p>
            <div class="conditions-list">
              <div class="condition-item" *ngFor="let condition of editableConditions; let i = index">
                <div class="condition-input-group">
                  <input 
                    type="text" 
                    [(ngModel)]="condition.display" 
                    [ngModelOptions]="{updateOn: 'blur'}"
                    class="condition-input"
                    placeholder="Enter condition name"
                    [disabled]="!!condition.id"
                  />
                  <button type="button" (click)="removeCondition(i)" class="btn-remove">
                    {{ condition.id ? 'Delete' : 'Remove' }}
                  </button>
                </div>
              </div>
            </div>
            <div class="add-condition">
              <input 
                type="text" 
                [(ngModel)]="newCondition" 
                placeholder="Add new condition"
                (keyup.enter)="addCondition()"
                class="condition-input"
              />
              <button type="button" (click)="addCondition()" class="btn-add">Add Condition</button>
            </div>
            <button (click)="saveConditions()" class="btn-save-conditions" [disabled]="isSavingConditions">
              {{ isSavingConditions ? 'Saving...' : 'Save Conditions to HealthLake' }}
            </button>
            <div *ngIf="conditionSaveMessage" class="message" [ngClass]="conditionSaveMessage.type">
              {{ conditionSaveMessage.text }}
            </div>
          </div>
          
          <div class="data-card">
            <h3>Latest Vital Signs</h3>
            <div class="vitals-grid">
              <div class="vital-item">
                <span class="vital-label">Temperature</span>
                <span class="vital-value">{{ patientData?.vitals?.temperature ? patientData.vitals.temperature + '&deg;C' : '--' }}</span>
              </div>
              <div class="vital-item">
                <span class="vital-label">Blood Pressure</span>
                <span class="vital-value">{{ patientData?.vitals?.blood_pressure }} mmHg</span>
              </div>
              <div class="vital-item">
                <span class="vital-label">Heart Rate</span>
                <span class="vital-value">{{ patientData?.vitals?.heart_rate }} bpm</span>
              </div>
              <div class="vital-item">
                <span class="vital-label">Blood Oxygen</span>
                <span class="vital-value">{{ patientData?.vitals?.blood_oxygen }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="loading" *ngIf="!patientData || !patientData.id">
        <p>Loading patient data...</p>
      </div>
    </div>
  `,
  styles: [`
    .container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background-color: #1a1a2e;
    }
    
    .navbar {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    }
    
    .navbar h2 {
      margin: 0;
      font-size: 24px;
    }
    
    .nav-links {
      display: flex;
      gap: 10px;
    }
    
    .nav-btn {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: none;
      padding: 8px 15px;
      border-radius: 5px;
      cursor: pointer;
      font-weight: 500;
      transition: background 0.3s;
    }
    
    .nav-btn:hover, .nav-btn.active {
      background: rgba(255, 255, 255, 0.3);
    }
    
    .nav-btn.logout {
      background: rgba(255, 67, 67, 0.6);
    }
    
    .nav-btn.logout:hover {
      background: rgba(255, 67, 67, 0.8);
    }
    
    .content {
      flex: 1;
      padding: 30px;
      max-width: 1000px;
      margin: 0 auto;
      width: 100%;
    }
    
    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 400px;
      color: #9d4edd;
      font-size: 18px;
    }
    
    .page-header {
      margin-bottom: 30px;
    }
    
    .page-header h1 {
      margin: 0 0 10px 0;
      color: #e0e0e0;
      font-size: 32px;
    }
    
    .page-header p {
      margin: 0;
      color: #b0b0b0;
      font-size: 16px;
    }
    
    .data-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .data-card {
      background: #252540;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
      border: 1px solid #3a3a50;
    }
    
    .data-card h3 {
      color: #9d4edd;
      font-size: 18px;
      margin: 0 0 20px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #9d4edd;
    }
    
    .editable-card {
      border-color: #5a7eea;
    }
    
    .editable-card h3 {
      color: #667eea;
      border-bottom-color: #667eea;
    }
    
    .data-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    .data-item {
      display: flex;
      flex-direction: column;
    }
    
    .data-item.full {
      grid-column: 1 / -1;
    }
    
    .editable-section {
      background: #2a2a40;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #667eea;
      margin-top: 15px;
    }
    
    .editable-section .label {
      color: #667eea;
      font-size: 16px;
      margin-bottom: 5px;
    }
    
    .label {
      color: #9d4edd;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 8px;
    }
    
    .value {
      color: #e0e0e0;
      font-size: 16px;
    }
    
    .value ul {
      margin: 0;
      padding-left: 20px;
      color: #e0e0e0;
    }
    
    .value li {
      margin: 4px 0;
    }
    
    .vitals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
    }
    
    .vital-item {
      background: #1a1a2e;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
      border: 1px solid #3a3a50;
    }
    
    .vital-label {
      display: block;
      color: #b0b0b0;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    
    .vital-value {
      display: block;
      color: #667eea;
      font-size: 20px;
      font-weight: bold;
    }
    
    .section-hint {
      color: #b0b0b0;
      font-size: 14px;
      margin: 0 0 15px 0;
      font-style: italic;
    }
    
    .conditions-list {
      margin-bottom: 20px;
    }
    
    .condition-item {
      margin-bottom: 12px;
    }
    
    .condition-input-group {
      display: flex;
      gap: 10px;
    }
    
    .condition-input {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid #3a3a50;
      border-radius: 5px;
      font-size: 14px;
      background-color: #1a1a2e;
      color: #e0e0e0;
      transition: border-color 0.3s;
    }
    
    .condition-input:disabled {
      background-color: #252540;
      cursor: not-allowed;
      opacity: 0.8;
    }
    
    .condition-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 5px rgba(102, 126, 234, 0.2);
    }
    
    .btn-remove {
      padding: 8px 15px;
      background: rgba(255, 67, 67, 0.6);
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.3s;
    }
    
    .btn-remove:hover {
      background: rgba(255, 67, 67, 0.8);
    }
    
    .add-condition {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    
    .btn-add {
      padding: 10px 20px;
      background: rgba(102, 126, 234, 0.6);
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.3s;
      white-space: nowrap;
    }
    
    .btn-add:hover {
      background: rgba(102, 126, 234, 0.8);
    }
    
    .btn-save-conditions {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      transition: transform 0.2s;
    }
    
    .btn-save-conditions:hover:not(:disabled) {
      transform: translateY(-2px);
    }
    
    .btn-save-conditions:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .message {
      margin-top: 12px;
      padding: 12px;
      border-radius: 5px;
      font-size: 14px;
    }
    
    .message.success {
      background: rgba(76, 175, 80, 0.2);
      color: #4caf50;
      border: 1px solid #4caf50;
    }
    
    .message.error {
      background: rgba(244, 67, 54, 0.2);
      color: #f44336;
      border: 1px solid #f44336;
    }
    
    @media (max-width: 768px) {
      .data-grid {
        grid-template-columns: 1fr;
      }
      
      .nav-links {
        flex-direction: column;
        gap: 5px;
      }
      
      .condition-input-group {
        flex-direction: column;
      }
      
      .btn-remove {
        width: 100%;
      }
      
      .add-condition {
        flex-direction: column;
      }
      
      .btn-add {
        width: 100%;
      }
    }
  `]
})
export class InputMedicalDataComponent {
  patientData: any = {};
  conditionResources: any[] = [];
  editableConditions: { id: string | null, display: string }[] = [];
  newCondition: string = '';
  isSavingConditions: boolean = false;
  conditionSaveMessage: any = null;
  
  allergyResources: any[] = [];
  editableAllergies: { id: string | null, display: string }[] = [];
  newAllergy: string = '';
  isSavingAllergies: boolean = false;
  allergySaveMessage: any = null;
  
  medicationResources: any[] = [];
  editableMedications: { id: string | null, display: string }[] = [];
  newMedication: string = '';
  isSavingMedications: boolean = false;
  medicationSaveMessage: any = null;
  
  encounterId: string | null = null;
  encounterResource: any = null;
  editableSymptoms: string[] = [];
  newSymptom: string = '';
  isSavingSymptoms: boolean = false;
  symptomSaveMessage: any = null;
  
  patientId: string = '89d9a9b7-9720-4881-a2ab-d7907544b26f';
  datastoreId: string = '';

  constructor(private router: Router, private authService: AuthService, private http: HttpClient) {}

  async ngOnInit() {
    const username = await this.authService.getCurrentUsername();
    console.log('Logged in as:', username);
    const encodedUsername = encodeURIComponent(username);

    this.http.get(`https://d1fsbknze3yrsm.cloudfront.net/api/patient-id/${encodedUsername}`).subscribe({
      next: (fetchData: any) => {
        this.patientId = fetchData.patientId;
        console.log('Patient ID:', this.patientId);
        this.loadPatientData();
      },
      error: (error) => {
        console.error('Failed to fetch patient ID:', error);
      }
    });
  }

  loadPatientData() {
    // Load dashboard data - using CloudFront which handles CORS
    this.http.get(
      `https://d1fsbknze3yrsm.cloudfront.net/api/patient/${this.patientId}/dashboard`
    ).subscribe(
      (data: any) => {
        this.patientData = data;
        console.log('Patient data loaded:', data);
      },
      (error) => {
        console.error('Error loading patient data:', error);
      }
    );

    // Load detailed conditions with IDs
    this.http.get(
      `https://d1fsbknze3yrsm.cloudfront.net/api/patient/${this.patientId}/conditions`
    ).subscribe(
      (data: any) => {
        this.datastoreId = data.datastore_id;
        this.conditionResources = data.conditions || [];
        this.editableConditions = this.conditionResources.map((c: any) => ({
          id: c.id,
          display: c.display
        }));
        console.log('Conditions loaded:', data);
      },
      (error) => {
        console.error('Error loading conditions:', error);
      }
    );

    // Load detailed allergies with IDs
    this.http.get(
      `https://d1fsbknze3yrsm.cloudfront.net/api/patient/${this.patientId}/allergies`
    ).subscribe(
      (data: any) => {
        this.allergyResources = data.allergies || [];
        this.editableAllergies = this.allergyResources.map((a: any) => ({
          id: a.id,
          display: a.display
        }));
        console.log('Allergies loaded:', data);
      },
      (error) => {
        console.error('Error loading allergies:', error);
      }
    );

    // Load detailed medications with IDs
    this.http.get(
      `https://d1fsbknze3yrsm.cloudfront.net/api/patient/${this.patientId}/medications`
    ).subscribe(
      (data: any) => {
        this.medicationResources = data.medications || [];
        this.editableMedications = this.medicationResources.map((m: any) => ({
          id: m.id,
          display: m.display
        }));
        console.log('Medications loaded:', data);
      },
      (error) => {
        console.error('Error loading medications:', error);
      }
    );

    // Load encounter with symptoms
    this.http.get(
      `https://d1fsbknze3yrsm.cloudfront.net/api/patient/${this.patientId}/encounters`
    ).subscribe(
      (data: any) => {
        this.encounterId = data.encounter_id;
        this.encounterResource = data.encounter;
        this.editableSymptoms = data.symptoms?.map((s: any) => s.display) || [];
        console.log('Encounters loaded:', data);
      },
      (error) => {
        console.error('Error loading encounters:', error);
      }
    );
  }

  addCondition() {
    if (this.newCondition.trim()) {
      this.editableConditions.push({
        id: null, // New conditions don't have an ID yet
        display: this.newCondition.trim()
      });
      this.newCondition = '';
    }
  }

  removeCondition(index: number) {
    const condition = this.editableConditions[index];
    
    if (condition.id) {
      // Existing condition - delete from server
      if (confirm(`Are you sure you want to delete "${condition.display}"?`)) {
        this.http.delete(
          `https://d1fsbknze3yrsm.cloudfront.net/api/patient/${this.patientId}/conditions/${condition.id}`
        ).subscribe(
          () => {
            this.editableConditions.splice(index, 1);
            this.conditionSaveMessage = {
              type: 'success',
              text: 'Condition deleted successfully!'
            };
            setTimeout(() => {
              this.conditionSaveMessage = null;
            }, 3000);
          },
          (error) => {
            console.error('Error deleting condition:', error);
            this.conditionSaveMessage = {
              type: 'error',
              text: 'Error deleting condition. Please try again.'
            };
            setTimeout(() => {
              this.conditionSaveMessage = null;
            }, 5000);
          }
        );
      }
    } else {
      // New condition not yet saved - just remove from list
      this.editableConditions.splice(index, 1);
    }
  }

  addAllergy() {
    if (this.newAllergy.trim()) {
      this.editableAllergies.push({
        id: null, // New allergies don't have an ID yet
        display: this.newAllergy.trim()
      });
      this.newAllergy = '';
    }
  }

  removeAllergy(index: number) {
    const allergy = this.editableAllergies[index];
    
    if (allergy.id) {
      // Existing allergy - delete from server
      if (confirm(`Are you sure you want to delete "${allergy.display}"?`)) {
        this.http.delete(
          `https://d1fsbknze3yrsm.cloudfront.net/api/patient/${this.patientId}/allergies/${allergy.id}`
        ).subscribe(
          () => {
            this.editableAllergies.splice(index, 1);
            this.allergySaveMessage = {
              type: 'success',
              text: 'Allergy deleted successfully!'
            };
            setTimeout(() => {
              this.allergySaveMessage = null;
            }, 3000);
          },
          (error) => {
            console.error('Error deleting allergy:', error);
            this.allergySaveMessage = {
              type: 'error',
              text: 'Error deleting allergy. Please try again.'
            };
            setTimeout(() => {
              this.allergySaveMessage = null;
            }, 5000);
          }
        );
      }
    } else {
      // New allergy not yet saved - just remove from list
      this.editableAllergies.splice(index, 1);
    }
  }

  addMedication() {
    if (this.newMedication.trim()) {
      this.editableMedications.push({
        id: null, // New medications don't have an ID yet
        display: this.newMedication.trim()
      });
      this.newMedication = '';
    }
  }

  removeMedication(index: number) {
    const medication = this.editableMedications[index];
    
    if (medication.id) {
      // Existing medication - delete from server
      if (confirm(`Are you sure you want to delete "${medication.display}"?`)) {
        this.http.delete(
          `https://d1fsbknze3yrsm.cloudfront.net/api/patient/${this.patientId}/medications/${medication.id}`
        ).subscribe(
          () => {
            this.editableMedications.splice(index, 1);
            this.medicationSaveMessage = {
              type: 'success',
              text: 'Medication deleted successfully!'
            };
            setTimeout(() => {
              this.medicationSaveMessage = null;
            }, 3000);
          },
          (error) => {
            console.error('Error deleting medication:', error);
            this.medicationSaveMessage = {
              type: 'error',
              text: 'Error deleting medication. Please try again.'
            };
            setTimeout(() => {
              this.medicationSaveMessage = null;
            }, 5000);
          }
        );
      }
    } else {
      // New medication not yet saved - just remove from list
      this.editableMedications.splice(index, 1);
    }
  }

  addSymptom() {
    if (this.newSymptom.trim()) {
      this.editableSymptoms.push(this.newSymptom.trim());
      this.newSymptom = '';
    }
  }

  removeSymptom(index: number) {
    this.editableSymptoms.splice(index, 1);
  }

  saveSymptoms() {
    if (!this.encounterId || !this.encounterResource) {
      this.symptomSaveMessage = {
        type: 'error',
        text: 'No encounter found. Unable to save symptoms.'
      };
      return;
    }

    this.isSavingSymptoms = true;
    this.symptomSaveMessage = null;

    // Update the encounter resource with new symptoms
    const updatedEncounter = {
      ...this.encounterResource,
      reasonCode: this.editableSymptoms.map(symptom => ({
        coding: [{
          display: symptom
        }]
      }))
    };

    this.http.put(
      `https://d1fsbknze3yrsm.cloudfront.net/api/patient/${this.patientId}/encounters/${this.encounterId}`,
      updatedEncounter
    ).subscribe(
      (response: any) => {
        this.isSavingSymptoms = false;
        this.symptomSaveMessage = {
          type: 'success',
          text: 'Successfully saved symptoms to HealthLake!'
        };
        
        console.log('Save response:', response);
        
        // Update the local encounter resource
        this.encounterResource = response;
        
        setTimeout(() => {
          this.symptomSaveMessage = null;
        }, 5000);
      },
      (error) => {
        this.isSavingSymptoms = false;
        console.error('Error saving symptoms:', error);
        this.symptomSaveMessage = {
          type: 'error',
          text: 'Error saving symptoms. Please check the console for details.'
        };
        setTimeout(() => {
          this.symptomSaveMessage = null;
        }, 5000);
      }
    );
  }

  saveConditions() {
    if (!this.patientId || !this.datastoreId) {
      this.conditionSaveMessage = {
        type: 'error',
        text: 'Missing patient ID or datastore ID. Unable to save conditions.'
      };
      return;
    }

    this.isSavingConditions = true;
    this.conditionSaveMessage = null;

    // Get conditions that are new (don't have an ID)
    const newConditions = this.editableConditions.filter(c => !c.id);

    if (newConditions.length === 0) {
      // No new conditions to save
      this.isSavingConditions = false;
      this.conditionSaveMessage = {
        type: 'success',
        text: 'No new conditions to save.'
      };
      setTimeout(() => {
        this.conditionSaveMessage = null;
      }, 3000);
      return;
    }

    // Create new condition resources for any new conditions
    const conditionRequests: any[] = [];
    for (const condition of newConditions) {
      const conditionResource = {
        resourceType: 'Condition',
        code: {
          coding: [{
            display: condition.display
          }]
        },
        subject: {
          reference: `Patient/${this.patientId}`
        },
        clinicalStatus: {
          coding: [{
            code: 'active',
            display: 'Active'
          }]
        }
      };

      conditionRequests.push(
        this.http.post(
          `https://d1fsbknze3yrsm.cloudfront.net/api/patient/${this.patientId}/conditions`,
          conditionResource
        ).toPromise()
      );
    }

    // Execute all condition creation requests
    Promise.all(conditionRequests)
      .then((responses: any[]) => {
        this.isSavingConditions = false;
        this.conditionSaveMessage = {
          type: 'success',
          text: `Successfully saved ${newConditions.length} new condition(s) to HealthLake!`
        };
        
        console.log('Save responses:', responses);
        
        // Update the local list with the returned IDs
        responses.forEach((response, index) => {
          const savedCondition = response;
          console.log('Processing response:', savedCondition);
          const localConditionIndex = this.editableConditions.findIndex(c => 
            c.display === newConditions[index].display && !c.id
          );
          
          if (localConditionIndex !== -1 && savedCondition?.id) {
            console.log(`Updating condition at index ${localConditionIndex} with ID ${savedCondition.id}`);
            this.editableConditions[localConditionIndex].id = savedCondition.id;
          }
        });
        
        console.log('Updated conditions:', this.editableConditions);
        
        setTimeout(() => {
          this.conditionSaveMessage = null;
        }, 5000);
      })
      .catch((error) => {
        this.isSavingConditions = false;
        console.error('Error saving conditions:', error);
        this.conditionSaveMessage = {
          type: 'error',
          text: 'Error saving conditions. Please check the console for details.'
        };
        setTimeout(() => {
          this.conditionSaveMessage = null;
        }, 5000);
      });
  }

  saveAllergies() {
    if (!this.patientId || !this.datastoreId) {
      this.allergySaveMessage = {
        type: 'error',
        text: 'Missing patient ID or datastore ID. Unable to save allergies.'
      };
      return;
    }

    this.isSavingAllergies = true;
    this.allergySaveMessage = null;

    // Get allergies that are new (don't have an ID)
    const newAllergies = this.editableAllergies.filter(a => !a.id);

    if (newAllergies.length === 0) {
      // No new allergies to save
      this.isSavingAllergies = false;
      this.allergySaveMessage = {
        type: 'success',
        text: 'No new allergies to save.'
      };
      setTimeout(() => {
        this.allergySaveMessage = null;
      }, 3000);
      return;
    }

    // Create new allergy resources for any new allergies
    const allergyRequests: any[] = [];
    for (const allergy of newAllergies) {
      const allergyResource = {
        resourceType: 'AllergyIntolerance',
        code: {
          coding: [{
            display: allergy.display
          }]
        },
        patient: {
          reference: `Patient/${this.patientId}`
        },
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            code: 'active',
            display: 'Active'
          }]
        },
        verificationStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
            code: 'confirmed',
            display: 'Confirmed'
          }]
        }
      };

      allergyRequests.push(
        this.http.post(
          `https://d1fsbknze3yrsm.cloudfront.net/api/patient/${this.patientId}/allergies`,
          allergyResource
        ).toPromise()
      );
    }

    // Execute all allergy creation requests
    Promise.all(allergyRequests)
      .then((responses: any[]) => {
        this.isSavingAllergies = false;
        this.allergySaveMessage = {
          type: 'success',
          text: `Successfully saved ${newAllergies.length} new allergy(ies) to HealthLake!`
        };
        
        console.log('Save responses:', responses);
        
        // Update the local list with the returned IDs
        responses.forEach((response, index) => {
          const savedAllergy = response;
          console.log('Processing response:', savedAllergy);
          const localAllergyIndex = this.editableAllergies.findIndex(a => 
            a.display === newAllergies[index].display && !a.id
          );
          
          if (localAllergyIndex !== -1 && savedAllergy?.id) {
            console.log(`Updating allergy at index ${localAllergyIndex} with ID ${savedAllergy.id}`);
            this.editableAllergies[localAllergyIndex].id = savedAllergy.id;
          }
        });
        
        console.log('Updated allergies:', this.editableAllergies);
        
        setTimeout(() => {
          this.allergySaveMessage = null;
        }, 5000);
      })
      .catch((error) => {
        this.isSavingAllergies = false;
        console.error('Error saving allergies:', error);
        this.allergySaveMessage = {
          type: 'error',
          text: 'Error saving allergies. Please check the console for details.'
        };
        setTimeout(() => {
          this.allergySaveMessage = null;
        }, 5000);
      });
  }

  saveMedications() {
    if (!this.patientId || !this.datastoreId) {
      this.medicationSaveMessage = {
        type: 'error',
        text: 'Missing patient ID or datastore ID. Unable to save medications.'
      };
      return;
    }

    this.isSavingMedications = true;
    this.medicationSaveMessage = null;

    // Get medications that are new (don't have an ID)
    const newMedications = this.editableMedications.filter(m => !m.id);

    if (newMedications.length === 0) {
      // No new medications to save
      this.isSavingMedications = false;
      this.medicationSaveMessage = {
        type: 'success',
        text: 'No new medications to save.'
      };
      setTimeout(() => {
        this.medicationSaveMessage = null;
      }, 3000);
      return;
    }

    // Create new medication resources for any new medications
    const medicationRequests: any[] = [];
    for (const medication of newMedications) {
      const medicationResource = {
        resourceType: 'MedicationRequest',
        medicationCodeableConcept: {
          coding: [{
            display: medication.display
          }]
        },
        subject: {
          reference: `Patient/${this.patientId}`
        },
        status: 'active',
        intent: 'order'
      };

      medicationRequests.push(
        this.http.post(
          `https://d1fsbknze3yrsm.cloudfront.net/api/patient/${this.patientId}/medications`,
          medicationResource
        ).toPromise()
      );
    }

    // Execute all medication creation requests
    Promise.all(medicationRequests)
      .then((responses: any[]) => {
        this.isSavingMedications = false;
        this.medicationSaveMessage = {
          type: 'success',
          text: `Successfully saved ${newMedications.length} new medication(s) to HealthLake!`
        };
        
        console.log('Save responses:', responses);
        
        // Update the local list with the returned IDs
        responses.forEach((response, index) => {
          const savedMedication = response;
          console.log('Processing response:', savedMedication);
          const localMedicationIndex = this.editableMedications.findIndex(m => 
            m.display === newMedications[index].display && !m.id
          );
          
          if (localMedicationIndex !== -1 && savedMedication?.id) {
            console.log(`Updating medication at index ${localMedicationIndex} with ID ${savedMedication.id}`);
            this.editableMedications[localMedicationIndex].id = savedMedication.id;
          }
        });
        
        console.log('Updated medications:', this.editableMedications);
        
        setTimeout(() => {
          this.medicationSaveMessage = null;
        }, 5000);
      })
      .catch((error) => {
        this.isSavingMedications = false;
        console.error('Error saving medications:', error);
        this.medicationSaveMessage = {
          type: 'error',
          text: 'Error saving medications. Please check the console for details.'
        };
        setTimeout(() => {
          this.medicationSaveMessage = null;
        }, 5000);
      });
  }
  
  navigate(path: string) {
    this.router.navigate([path]);
  }

  logout() {
    this.authService.logout();
  }

  cleanPatientName(name: string): string {
    if (!name) return '';
    // Remove all numbers from the name
    return name.replace(/\d+/g, '').trim();
  }
}

