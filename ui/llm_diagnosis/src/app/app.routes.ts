import { Routes } from '@angular/router';
import { LoginComponent } from './login.component';
import { InputMedicalDataComponent } from './input-medical-data.component';
import { ViewMedicalDataComponent } from './view-medical-data.component';
import { ChatbotComponent } from './chatbot.component';
import { AlertsComponent } from './alerts.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/input-data', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'input-data', component: InputMedicalDataComponent, canActivate: [AuthGuard] },
  { path: 'view-data', component: ViewMedicalDataComponent, canActivate: [AuthGuard] },
  { path: 'chatbot', component: ChatbotComponent, canActivate: [AuthGuard] },
  { path: 'alerts', component: AlertsComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '/input-data' }
];
