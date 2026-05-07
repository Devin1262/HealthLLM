import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './services/auth.service';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <nav class="navbar">
        <h2>Medical Diagnosis AI</h2>
        <div class="nav-links">
          <button (click)="navigate('/input-data')" class="nav-btn">Input Data</button>
          <button (click)="navigate('/view-data')" class="nav-btn">View Data</button>
          <button (click)="navigate('/chatbot')" class="nav-btn active">Chatbot</button>
          <button (click)="navigate('/alerts')" class="nav-btn">Alerts</button>
          <button (click)="logout()" class="nav-btn logout">Logout</button>
        </div>
      </nav>
      
      <div class="chat-container">
        <div class="chat-header">
          <h1>AI Medical Chatbot</h1>
          <p>Discuss your medical data and symptoms with our AI assistant</p>
        </div>
        
        <div class="chat-window" #chatWindow>
          <div *ngIf="isLoadingContext" class="loading-message">
            <div class="spinner"></div>
            <p>Loading your medical data...</p>
          </div>
          
          <div *ngFor="let message of messages" [class.message]="true" [class.user]="message.sender === 'user'" [class.ai]="message.sender === 'ai'">
            <div class="message-bubble">
              <div class="message-sender">{{ message.sender === 'user' ? 'You' : 'AI Assistant' }}</div>
              <div class="message-content" [innerHTML]="formatMessage(message.content)"></div>
              <div class="message-time">{{ message.timestamp | date: 'HH:mm' }}</div>
            </div>
          </div>
          
          <div *ngIf="isSendingMessage" class="message ai">
            <div class="message-bubble">
              <div class="message-sender">AI Assistant</div>
              <div class="message-content typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="chat-input-area">
          <form (ngSubmit)="sendMessage()" class="input-form">
            <input 
              type="text" 
              [(ngModel)]="userInput" 
              name="userInput"
              placeholder="Ask a question about your medical data..."
              required
            />
            <button type="submit" [disabled]="!userInput.trim() || isSendingMessage || isLoadingContext">
              {{ isSendingMessage ? 'Sending...' : 'Send' }}
            </button>
          </form>
          <p class="helper-text">You can ask questions like: "What could cause my symptoms?", "Should I see a specialist?", "What are my next steps?"</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      display: flex;
      flex-direction: column;
      height: 100vh;
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
    
    .chat-container {
      display: flex;
      flex-direction: column;
      flex: 1;
      max-width: 900px;
      margin: 20px auto;
      width: 100%;
      background: #252540;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
      border: 1px solid #3a3a50;
      overflow: hidden;
    }
    
    .chat-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      text-align: center;
    }
    
    .chat-header h1 {
      margin: 0 0 5px 0;
      font-size: 24px;
    }
    
    .chat-header p {
      margin: 0;
      font-size: 14px;
      opacity: 0.9;
    }
    
    .chat-window {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .message {
      display: flex;
      margin-bottom: 10px;
    }
    
    .message.user {
      justify-content: flex-end;
    }
    
    .message.ai {
      justify-content: flex-start;
    }
    
    .message-bubble {
      max-width: 70%;
      padding: 12px 16px;
      border-radius: 10px;
      word-wrap: break-word;
    }
    
    .user .message-bubble {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .ai .message-bubble {
      background: #3a3a50;
      color: #e0e0e0;
      border-left: 4px solid #9d4edd;
      border: 1px solid #4a4a60;
      border-left: 4px solid #9d4edd;
    }
    
    .message-sender {
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 4px;
      opacity: 0.8;
    }
    
    .message-content {
      font-size: 15px;
      line-height: 1.6;
      margin-left: 10px;
    }
    
    .message-content h1 {
      font-size: 20px;
      margin: 10px 0 8px 0;
      color: #e0e0e0;
    }
    
    .message-content h2 {
      font-size: 18px;
      margin: 10px 0 8px 0;
      color: #e0e0e0;
    }
    
    .message-content h3 {
      font-size: 16px;
      margin: 8px 0 6px 0;
      color: #9d4edd;
    }
    
    .message-content h4 {
      font-size: 14px;
      margin: 6px 0 4px 0;
      color: #b0b0b0;
    }
    
    .message-content strong {
      color: #667eea;
      font-weight: 600;
    }
    
    .message-content em {
      font-style: italic;
      color: #c0c0c0;
    }
    
    .message-content blockquote {
      border-left: 3px solid #9d4edd;
      padding-left: 12px;
      margin: 8px 0;
      color: #ff6b6b;
      background: rgba(255, 107, 107, 0.1);
      padding: 8px 12px;
      border-radius: 4px;
    }
    
    .message-content hr {
      border: none;
      border-top: 1px solid #3a3a50;
      margin: 12px 0;
    }
    
    .message-content ol, .message-content ul {
      margin: 8px 0;
      padding-left: 25px;
      list-style-position: outside;
    }
    
    .message-content li {
      margin: 4px 0;
    }
    
    .message-content .response-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 13px;
    }
    
    .message-content .response-table th {
      background: #3a3a50;
      color: #9d4edd;
      padding: 8px;
      text-align: left;
      border: 1px solid #4a4a60;
      font-weight: 600;
    }
    
    .message-content .response-table td {
      padding: 8px;
      border: 1px solid #3a3a50;
      color: #e0e0e0;
    }
    
    .message-content .response-table tr:nth-child(even) {
      background: rgba(255, 255, 255, 0.02);
    }
    
    .message-time {
      font-size: 11px;
      margin-top: 5px;
      opacity: 0.6;
    }
    
    .chat-input-area {
      border-top: 1px solid #3a3a50;
      padding: 15px;
      background-color: #1f1f35;
    }
    
    .input-form {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
    }
    
    input {
      flex: 1;
      padding: 12px;
      border: 1px solid #3a3a50;
      border-radius: 5px;
      font-size: 14px;
      font-family: inherit;
      background-color: #252540;
      color: #e0e0e0;
      transition: border-color 0.3s;
    }
    
    input:focus {
      outline: none;
      border-color: #9d4edd;
      box-shadow: 0 0 5px rgba(157, 78, 221, 0.2);
    }
    
    button {
      padding: 12px 25px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-weight: 600;
      transition: transform 0.2s;
    }
    
    button:hover:not(:disabled) {
      transform: translateY(-2px);
    }
    
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .helper-text {
      margin: 0;
      font-size: 12px;
      color: #808080;
      text-align: center;
    }
    
    .loading-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: #9d4edd;
    }
    
    .spinner {
      border: 3px solid #3a3a50;
      border-top: 3px solid #9d4edd;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin-bottom: 15px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .typing {
      display: flex;
      gap: 5px;
      align-items: center;
    }
    
    .typing span {
      width: 8px;
      height: 8px;
      background-color: #9d4edd;
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out both;
    }
    
    .typing span:nth-child(1) {
      animation-delay: -0.32s;
    }
    
    .typing span:nth-child(2) {
      animation-delay: -0.16s;
    }
    
    @keyframes bounce {
      0%, 80%, 100% {
        transform: scale(0);
      }
      40% {
        transform: scale(1);
      }
    }
    
    @media (max-width: 768px) {
      .chat-container {
        margin: 0;
        border-radius: 0;
      }
      
      .message-bubble {
        max-width: 85%;
      }
      
      .nav-links {
        flex-direction: column;
        gap: 5px;
      }
    }
  `]
})
export class ChatbotComponent implements OnInit {
  messages: Message[] = [];
  
  userInput = '';
  patientId: string = '89d9a9b7-9720-4881-a2ab-d7907544b26f';
  patientContext: any = null;
  isLoadingContext: boolean = true;
  isSendingMessage: boolean = false;
  
  constructor(
    private router: Router, 
    private authService: AuthService,
    private http: HttpClient
  ) {}

  async ngOnInit() {
    const username = await this.authService.getCurrentUsername();
    console.log('Logged in as:', username);
    const encodedUsername = encodeURIComponent(username);

    this.http.get(`https://d1fsbknze3yrsm.cloudfront.net/api/patient-id/${encodedUsername}`).subscribe({
      next: (fetchData: any) => {
        this.patientId = fetchData.patientId;
        console.log('Patient ID:', this.patientId);
        this.loadPatientContext();
      },
      error: (error) => {
        console.error('Failed to fetch patient ID:', error);
      }
    });
  }

  loadPatientContext() {
    this.isLoadingContext = true;
    
    this.http.get(
      `https://d1fsbknze3yrsm.cloudfront.net/api/patient/${this.patientId}/dashboard`
    ).subscribe(
      (data: any) => {
        this.patientContext = data;
        this.isLoadingContext = false;
        console.log('Patient context loaded:', data);
        
        this.messages.push({
          id: '1',
          sender: 'ai',
          content: `Hello! I'm your AI medical assistant. I have reviewed your medical data and I'm ready to answer questions about your health. How can I help you today?`,
          timestamp: new Date()
        });
      },
      (error) => {
        console.error('Error loading patient context:', error);
        this.isLoadingContext = false;
        this.messages.push({
          id: '1',
          sender: 'ai',
          content: 'Hello! I\'m having trouble loading your medical data. Please try refreshing the page.',
          timestamp: new Date()
        });
      }
    );
  }
  
  navigate(path: string) {
    this.router.navigate([path]);
  }

  logout() {
    this.authService.logout();
  }
  
  sendMessage() {
    if (!this.userInput.trim() || this.isSendingMessage) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: this.userInput,
      timestamp: new Date()
    };
    this.messages.push(userMessage);
    
    const userQuestion = this.userInput;
    this.userInput = '';
    this.isSendingMessage = true;
    
    setTimeout(() => {
      const chatWindow = document.querySelector('.chat-window');
      if (chatWindow) {
        chatWindow.scrollTop = chatWindow.scrollHeight;
      }
    }, 100);
    
    this.http.post(
      `https://d1fsbknze3yrsm.cloudfront.net/api/llm/query?instruction=${encodeURIComponent(userQuestion)}`,
      this.patientContext
    ).subscribe(
      (response: any) => {
        this.isSendingMessage = false;
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          content: response.summary || 'I apologize, but I was unable to generate a response.',
          timestamp: new Date()
        };
        this.messages.push(aiMessage);
        
        setTimeout(() => {
          const chatWindow = document.querySelector('.chat-window');
          if (chatWindow) {
            chatWindow.scrollTop = chatWindow.scrollHeight;
          }
        }, 100);
      },
      (error) => {
        this.isSendingMessage = false;
        console.error('Error calling LLM:', error);
        
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          content: 'I apologize, but I encountered an error processing your question. Please try again.',
          timestamp: new Date()
        };
        this.messages.push(errorMessage);
        
        setTimeout(() => {
          const chatWindow = document.querySelector('.chat-window');
          if (chatWindow) {
            chatWindow.scrollTop = chatWindow.scrollHeight;
          }
        }, 100);
      }
    );
  }

  formatMessage(content: string): string {
    if (!content) return '';
    
    let formatted = content;
    
    formatted = formatted.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    formatted = formatted.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    formatted = formatted.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    formatted = formatted.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
    formatted = formatted.replace(/^---$/gim, '<hr>');
    
    const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g;
    formatted = formatted.replace(tableRegex, (match: string, header: string, rows: string) => {
      const headers = header.split('|').filter((h: string) => h.trim()).map((h: string) => `<th>${h.trim()}</th>`).join('');
      const rowsHtml = rows.trim().split('\n').map((row: string) => {
        const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) => `<td>${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table class="response-table"><thead><tr>${headers}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
    });
    
    formatted = formatted.replace(/^\d+\.\s+(.*)$/gim, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>');
    formatted = formatted.replace(/^[-*]\s+(.*)$/gim, '<li>$1</li>');
    formatted = formatted.replace(/\n\n/g, '<br><br>');
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  }
}

