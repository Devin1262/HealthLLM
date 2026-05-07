import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-view-medical-data',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <nav class="navbar">
        <h2>Medical Diagnosis AI</h2>
        <div class="nav-links">
          <button (click)="navigate('/input-data')" class="nav-btn">Input Data</button>
          <button (click)="navigate('/view-data')" class="nav-btn active">View Data</button>
          <button (click)="navigate('/chatbot')" class="nav-btn">Chatbot</button>
          <button (click)="navigate('/alerts')" class="nav-btn">Alerts</button>
          <button (click)="logout()" class="nav-btn logout">Logout</button>
        </div>
      </nav>
      
      <div class="content">
        <div class="page-header">
          <h1>Current Medical Data</h1>
          <p>View and review the latest medical information on file</p>
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
          
          <div class="data-card">
            <h3>Current Symptoms</h3>
            <div class="data-item full">
              <span class="label">Chief Complaint:</span>
              <span class="value">{{ patientData?.chief_symptom }}</span>
            </div>
            <div class="data-item full">
              <span class="label">Additional Symptoms:</span>
              <span class="value">{{ patientData?.other_symptoms?.join(', ') }}</span>
            </div>
          </div>
          
          <div class="data-card">
            <h3>Medical History</h3>
            <div class="data-item full">
              <span class="label">Current Medications:</span>
              <span class="value">
                <ul>
                  <li *ngFor="let med of patientData?.medications">
                    {{ med }}
                  </li>
                </ul>
              </span>
            </div>
            <div class="data-item full">
              <span class="label">Known Allergies:</span>
              <span class="value">{{ patientData?.allergies?.join(', ') }}</span>
            </div>
            <div class="data-item full">
              <span class="label">Previous Conditions:</span>
              <span class="value">
                <ul>
                  <li *ngFor="let c of patientData?.conditions">
                    {{ c }}
                  </li>
                </ul>
              </span>
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
          
          <div class="button-group">
            <button (click)="navigate('/input-data')" class="btn-primary">Update Data</button>
            <button (click)="navigate('/chatbot')" class="btn-secondary">Discuss with AI</button>
          </div>
        </div>
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
      margin-bottom: 15px;
    }
    
    .label {
      color: #b0b0b0;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 5px;
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
    
    .value ul li {
      margin: 5px 0;
    }
    
    .vitals-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
    }
    
    .vital-item {
      background: #1a1a2e;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #9d4edd;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      border: 1px solid #3a3a50;
      border-left: 4px solid #9d4edd;
    }
    
    .vital-label {
      color: #b0b0b0;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    
    .vital-value {
      color: #9d4edd;
      font-size: 24px;
      font-weight: bold;
    }
    
    .button-group {
      display: flex;
      gap: 15px;
      margin-top: 20px;
    }
    
    .btn-primary, .btn-secondary {
      padding: 12px 30px;
      font-size: 16px;
      font-weight: 600;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      transition: transform 0.2s;
      flex: 1;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .btn-primary:hover {
      transform: translateY(-2px);
    }
    
    .btn-secondary {
      background: #3a3a50;
      color: #e0e0e0;
      border: 1px solid #5a5a70;
    }
    
    .btn-secondary:hover {
      background: #4a4a60;
    }
    
    @media (max-width: 768px) {
      .data-grid {
        grid-template-columns: 1fr;
      }
      
      .vitals-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      
      .nav-links {
        flex-direction: column;
        gap: 5px;
      }
    }
  `]
})
export class ViewMedicalDataComponent {
  
  patientData: any = {};

  constructor(private router: Router, private authService: AuthService, private http: HttpClient) {}

  async ngOnInit() {
    const username = await this.authService.getCurrentUsername();
    console.log('Logged in as:', username);
    const encodedUsername = encodeURIComponent(username);
    console.log('Encoded username:', encodedUsername);
    console.log('Calling URL:', `https://d1fsbknze3yrsm.cloudfront.net/api/patient-id/${encodedUsername}`);

    this.http.get(`https://d1fsbknze3yrsm.cloudfront.net/api/example`).subscribe((data: any) => {
      console.log(data)
    });
    
    this.http.get(`https://d1fsbknze3yrsm.cloudfront.net/api/patient-id/${encodedUsername}`).subscribe({
      next: (fetchData: any) => {
        const patientId = fetchData.patientId;
        console.log('Patient ID:', patientId);

        this.http.get(
          `https://d1fsbknze3yrsm.cloudfront.net/api/patient/${patientId}/dashboard`
        ).subscribe((data: any) => {
          this.patientData = data;
          console.log(data)
        });
      },
      error: (error) => {
        console.error('Failed to fetch patient ID:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        console.error('Full error:', JSON.stringify(error, null, 2));
      }
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

