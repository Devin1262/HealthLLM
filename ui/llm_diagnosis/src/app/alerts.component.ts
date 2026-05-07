import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './services/auth.service';

const API_BASE = 'https://d1fsbknze3yrsm.cloudfront.net';

interface FhirRef {
  resource_type: string;
  resource_id: string;
}

interface LabAlert {
  type: string;
  name: string;
  value: string;
  severity: 'high' | 'moderate' | 'low';
  message: string;
  normal_range: string;
  fhir_ref?: FhirRef;
}

interface AiRisk {
  risk: string;
  severity: 'high' | 'moderate' | 'low';
  recommendation: string;
  context?: any;
}

interface AlertsData {
  patient_id: string;
  patient_name: string;
  generated_at: string;
  lab_alerts: LabAlert[];
  ai_risks: AiRisk[];
  vitals_snapshot: {
    temperature: number | null;
    heart_rate: number | null;
    blood_oxygen: number | null;
    blood_pressure: string | null;
  };
}

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <nav class="navbar">
        <h2>Medical Diagnosis AI</h2>
        <div class="nav-links">
          <button (click)="navigate('/input-data')" class="nav-btn">Input Data</button>
          <button (click)="navigate('/view-data')" class="nav-btn">View Data</button>
          <button (click)="navigate('/chatbot')" class="nav-btn">Chatbot</button>
          <button (click)="navigate('/alerts')" class="nav-btn active">Alerts</button>
          <button (click)="logout()" class="nav-btn logout">Logout</button>
        </div>
      </nav>

      <div class="content">
        <div class="page-header">
          <div class="header-left">
            <h1>Alert Dashboard</h1>
            <p>Critical Lab Values and AI-Flagged Risks for {{ cleanPatientName(alertsData?.patient_name) || 'Patient' }}</p>
          </div>
          <div class="header-right">
            <div class="poll-status">
              <span *ngIf="loading">Fetching alerts...</span>
            </div>
          </div>
        </div>

        <div *ngIf="error" class="error-banner">
          <span class="error-icon">⚠</span> {{ error }}
        </div>


        <div *ngIf="loading && !alertsData" class="skeleton-container">
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
        </div>

        <div *ngIf="alertsData" class="alerts-container">

          <div class="data-card">
            <h3>Vitals Snapshot</h3>
            <div class="vitals-grid">
              <div class="vital-item" [class.vital-critical]="isTempCritical()" [class.vital-warning]="isTempWarning()">
                <span class="vital-label">Temperature</span>
                <span class="vital-value">{{ alertsData.vitals_snapshot.temperature != null ? alertsData.vitals_snapshot.temperature + '°C' : '—' }}</span>
              </div>
              <div class="vital-item" [class.vital-critical]="isHrCritical()" [class.vital-warning]="isHrWarning()">
                <span class="vital-label">Heart Rate</span>
                <span class="vital-value">{{ alertsData.vitals_snapshot.heart_rate != null ? alertsData.vitals_snapshot.heart_rate + ' bpm' : '—' }}</span>
              </div>
              <div class="vital-item" [class.vital-critical]="isO2Critical()" [class.vital-warning]="isO2Warning()">
                <span class="vital-label">SpO2</span>
                <span class="vital-value">{{ alertsData.vitals_snapshot.blood_oxygen != null ? alertsData.vitals_snapshot.blood_oxygen + '%' : '—' }}</span>
              </div>
              <div class="vital-item">
                <span class="vital-label">Blood Pressure</span>
                <span class="vital-value">{{ alertsData.vitals_snapshot.blood_pressure || '—' }}</span>
              </div>
            </div>
          </div>

          <div class="data-card">
            <h3>Critical Lab Values</h3>
            <div *ngIf="alertsData.lab_alerts.length === 0" class="all-clear-msg">
              <span class="check-icon">✓</span> No critical lab values detected
            </div>
            <div *ngFor="let alert of alertsData.lab_alerts" class="alert-item" [ngClass]="'alert-' + alert.severity">
              <div class="alert-header">
                <div class="alert-title-group">
                  <span class="severity-badge" [ngClass]="'badge-' + alert.severity">
                    {{ alert.severity | titlecase }}
                  </span>
                  <span class="alert-name">{{ alert.name }}</span>
                  <span class="alert-value">{{ alert.value }}</span>
                </div>
                <button *ngIf="alert.fhir_ref" (click)="viewFhirContext(alert)" class="btn-context">
                  View
                </button>
              </div>
              <p class="alert-message">{{ alert.message }}</p>
              <p class="alert-normal">Normal range: {{ alert.normal_range }}</p>
            </div>
          </div>

          <div class="data-card">
            <h3>AI-Flagged Risks</h3>
            <div *ngIf="alertsData.ai_risks.length === 0" class="all-clear-msg">
              <span class="check-icon">✓</span> No AI-flagged risks detected
            </div>
            <div *ngFor="let risk of alertsData.ai_risks" class="alert-item" [ngClass]="'alert-' + risk.severity">
              <div class="alert-header">
                <div class="alert-title-group">
                  <span class="severity-badge" [ngClass]="'badge-' + risk.severity">
                    {{ risk.severity | titlecase }}
                  </span>
                  <span class="alert-name">{{ risk.risk }}</span>
                </div>
                <button *ngIf="risk.context" (click)="viewAiContext(risk)" class="btn-context">
                  View
                </button>
              </div>
              <p class="alert-recommendation"><strong>Recommendation:</strong> {{ risk.recommendation }}</p>
            </div>
          </div>

        </div>
      </div>

      <div *ngIf="showModal" class="modal-overlay" (click)="closeModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title-group">
              <h3 class="modal-title">{{ modalTitle }}</h3>
              <span class="modal-subtitle">{{ modalSubtitle }}</span>
            </div>
            <div class="modal-actions">
              <button (click)="copyJson()" class="btn-copy" [class.copied]="copied">
                {{ copied ? 'Copied!' : 'Copy JSON' }}
              </button>
              <button (click)="closeModal()" class="btn-close">✕</button>
            </div>
          </div>
          <div *ngIf="modalLoading" class="modal-loading">
            <div class="modal-spinner"></div>
            Loading resource…
          </div>
          <div *ngIf="modalError" class="modal-error">⚠ {{ modalError }}</div>
          <pre *ngIf="modalData && !modalLoading" class="json-viewer">{{ modalData | json }}</pre>
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
      box-sizing: border-box;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .header-left h1 {
      margin: 0 0 6px 0;
      color: #e0e0e0;
      font-size: 32px;
    }

    .header-left p {
      margin: 0;
      color: #b0b0b0;
      font-size: 15px;
    }

    .header-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
    }


    .poll-status {
      display: flex;
      align-items: center;
      gap: 7px;
      color: #b0b0b0;
      font-size: 13px;
    }


    .last-updated {
      color: #7a7a90;
      font-size: 12px;
    }

    .error-banner {
      background: rgba(255, 71, 87, 0.15);
      border: 1px solid #ff4757;
      color: #ff6b7a;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
    }

    .error-icon {
      margin-right: 6px;
    }


    .skeleton-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .skeleton-card {
      background: #252540;
      border-radius: 10px;
      height: 140px;
      animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
      0%   { opacity: 0.6; }
      50%  { opacity: 1; }
      100% { opacity: 0.6; }
    }

    .alerts-container {
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
      border: 1px solid #3a3a50;
      border-left: 4px solid #9d4edd;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .vital-item.vital-critical {
      border-left-color: #ff4757;
      background: rgba(255, 71, 87, 0.08);
    }

    .vital-item.vital-warning {
      border-left-color: #ffa502;
      background: rgba(255, 165, 2, 0.06);
    }

    .vital-label {
      color: #b0b0b0;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 8px;
      letter-spacing: 0.4px;
    }

    .vital-value {
      color: #9d4edd;
      font-size: 22px;
      font-weight: bold;
    }

    .vital-item.vital-critical .vital-value { color: #ff4757; }
    .vital-item.vital-warning  .vital-value { color: #ffa502; }

    .alert-item {
      border-radius: 8px;
      padding: 16px 18px;
      margin-bottom: 14px;
      border: 1px solid transparent;
    }

    .alert-item:last-child {
      margin-bottom: 0;
    }

    .alert-high {
      background: rgba(255, 71, 87, 0.1);
      border-color: #ff4757;
    }

    .alert-moderate {
      background: rgba(255, 165, 2, 0.08);
      border-color: #ffa502;
    }

    .alert-moderate {
      background: rgba(102, 126, 234, 0.1);
      border-color: #667eea;
    }

    .alert-high {
      background: rgba(255, 165, 2, 0.08);
      border-color: #ffa502;
    }

    .alert-info {
      background: rgba(176, 176, 176, 0.07);
      border-color: #5a5a70;
    }

    .alert-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .alert-title-group {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      min-width: 0;
    }

    .severity-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }

    .badge-high      { background: #ff4757; color: white; }
    .badge-moderate  { background: #ffa502; color: #1a1a2e; }
    .badge-low       { background: #5a5a70; color: #e0e0e0; }

    .alert-name {
      color: #e0e0e0;
      font-weight: 600;
      font-size: 15px;
    }

    .alert-value {
      color: #9d4edd;
      font-weight: 700;
      font-size: 15px;
    }

    .alert-high     .alert-value { color: #ff6b7a; }
    .alert-moderate .alert-value { color: #ffbe76; }

    .alert-message {
      color: #c0c0c0;
      margin: 6px 0 4px 0;
      font-size: 14px;
    }

    .alert-normal {
      color: #7a7a90;
      margin: 0;
      font-size: 12px;
    }

    .alert-recommendation {
      color: #b0b0b0;
      margin: 6px 0 0 0;
      font-size: 15px;
    }

    .alert-recommendation strong {
      color: #c0c0d0;
    }

    .all-clear-msg {
      color: #4caf50;
      font-size: 15px;
      padding: 12px 0;
    }

    .check-icon {
      margin-right: 6px;
      font-weight: bold;
    }

    .btn-context {
      background: transparent;
      color: #9d4edd;
      border: 1px solid #9d4edd;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.2s, color 0.2s;
      flex-shrink: 0;
    }

    .btn-context:hover {
      background: #9d4edd;
      color: white;
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-card {
      background: #252540;
      border: 1px solid #3a3a50;
      border-radius: 12px;
      width: 100%;
      max-width: 760px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 20px 24px 16px;
      border-bottom: 1px solid #3a3a50;
      gap: 16px;
      flex-shrink: 0;
    }

    .modal-title-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .modal-title {
      margin: 0;
      color: #9d4edd;
      font-size: 17px;
    }

    .modal-subtitle {
      color: #7a7a90;
      font-size: 12px;
      font-family: monospace;
      word-break: break-all;
    }

    .modal-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-shrink: 0;
    }

    .btn-copy {
      background: #3a3a50;
      color: #e0e0e0;
      border: 1px solid #5a5a70;
      padding: 6px 14px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-copy:hover {
      background: #4a4a60;
    }

    .btn-copy.copied {
      background: #2d6a4f;
      border-color: #4caf50;
      color: #4caf50;
    }

    .btn-close {
      background: transparent;
      color: #b0b0b0;
      border: 1px solid #5a5a70;
      width: 32px;
      height: 32px;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, color 0.2s;
    }

    .btn-close:hover {
      background: rgba(255, 71, 87, 0.15);
      color: #ff4757;
      border-color: #ff4757;
    }

    .modal-loading {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 40px 24px;
      color: #b0b0b0;
      font-size: 14px;
    }

    .modal-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #3a3a50;
      border-top-color: #9d4edd;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      flex-shrink: 0;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .modal-error {
      padding: 20px 24px;
      color: #ff6b7a;
      font-size: 14px;
    }

    .json-viewer {
      margin: 0;
      padding: 20px 24px;
      overflow-y: auto;
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      line-height: 1.6;
      color: #c0d0c0;
      background: #1a1a2e;
      border-radius: 0 0 12px 12px;
      white-space: pre-wrap;
      word-break: break-word;
    }

    @media (max-width: 768px) {
      .vitals-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .page-header {
        flex-direction: column;
      }

      .header-right {
        align-items: flex-start;
      }


      .nav-links {
        flex-wrap: wrap;
        gap: 5px;
      }
    }
  `]
})
export class AlertsComponent implements OnInit, OnDestroy {
  alertsData: AlertsData | null = null;
  loading = true;
  error: string | null = null;

  selectedPatientId: string | null = null;

  showModal = false;
  modalTitle = '';
  modalSubtitle = '';
  modalData: any = null;
  modalLoading = false;
  modalError: string | null = null;
  copied = false;

  private copyResetTimer: any;

  constructor(private router: Router, private authService: AuthService, private http: HttpClient) {}

  ngOnInit() {
    this.initializePatient();
  }

  ngOnDestroy() {
    clearTimeout(this.copyResetTimer);
  }

  async initializePatient() {
    try {
      const username = await this.authService.getCurrentUsername();
      const encodedUsername = encodeURIComponent(username);

      this.http.get<{ patientId: string }>(`${API_BASE}/api/patient-id/${encodedUsername}`).subscribe({
        next: (data: { patientId: string }) => {
          this.selectedPatientId = data.patientId;
          this.loadAlerts();
        },
        error: () => {
          this.error = 'No patient assigned to your account.';
          this.loading = false;
        }
      });
    } catch {
      this.error = 'Failed to determine user identity.';
      this.loading = false;
    }
  }

  loadAlerts() {
    if (!this.selectedPatientId) return;
    this.loading = true;
    this.error = null;
    this.http.get<AlertsData>(`${API_BASE}/api/patient/${this.selectedPatientId}/alerts`).subscribe({
      next: (data: AlertsData) => {
        this.alertsData = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load alerts. The backend may be unavailable.';
        this.loading = false;
      }
    });
  }

  viewFhirContext(alert: LabAlert) {
    if (!alert.fhir_ref) return;
    this.showModal = true;
    this.modalTitle = `${alert.name} — Source Observation`;
    this.modalSubtitle = `${alert.fhir_ref.resource_type}/${alert.fhir_ref.resource_id}`;
    this.modalData = null;
    this.modalLoading = true;
    this.modalError = null;
    this.copied = false;

    this.http.get(`${API_BASE}/api/resource/${alert.fhir_ref.resource_type}/${alert.fhir_ref.resource_id}`)
      .subscribe({
        next: (data: any) => {
          this.modalData = data;
          this.modalLoading = false;
        },
        error: () => {
          this.modalError = 'Failed to load FHIR resource from HealthLake.';
          this.modalLoading = false;
        }
      });
  }

  viewAiContext(risk: AiRisk) {
    this.showModal = true;
    this.modalTitle = 'AI Risk — Clinical Context';
    this.modalSubtitle = 'Vitals and conditions sent to the AI model';
    this.modalData = risk.context ?? null;
    this.modalLoading = false;
    this.modalError = null;
    this.copied = false;
  }

  closeModal() {
    this.showModal = false;
    this.modalData = null;
    this.modalError = null;
  }

  copyJson() {
    if (!this.modalData) return;
    navigator.clipboard.writeText(JSON.stringify(this.modalData, null, 2)).then(() => {
      this.copied = true;
      this.copyResetTimer = setTimeout(() => this.copied = false, 2000);
    });
  }


  isTempCritical(): boolean {
    const t = this.alertsData?.vitals_snapshot?.temperature;
    return t != null && (t >= 40.0 || t < 35.0);
  }
  isTempWarning(): boolean {
    const t = this.alertsData?.vitals_snapshot?.temperature;
    return t != null && !this.isTempCritical() && (t >= 38.5 || t < 35.5);
  }
  isHrCritical(): boolean {
    const h = this.alertsData?.vitals_snapshot?.heart_rate;
    return h != null && (h > 130 || h < 50);
  }
  isHrWarning(): boolean {
    const h = this.alertsData?.vitals_snapshot?.heart_rate;
    return h != null && !this.isHrCritical() && (h > 100 || h < 60);
  }
  isO2Critical(): boolean {
    const o = this.alertsData?.vitals_snapshot?.blood_oxygen;
    return o != null && o < 90;
  }
  isO2Warning(): boolean {
    const o = this.alertsData?.vitals_snapshot?.blood_oxygen;
    return o != null && !this.isO2Critical() && o < 94;
  }

  cleanPatientName(name: string | undefined): string {
    if (!name) return '';
    // Remove all numbers from the name
    return name.replace(/\d+/g, '').trim();
  }

  navigate(path: string) {
    this.router.navigate([path]);
  }

  logout() {
    this.authService.logout();
  }
}
