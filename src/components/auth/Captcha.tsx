import React, { useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

interface CaptchaProps {
  onVerify: (success: boolean) => void;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export function Captcha({ onVerify, difficulty = 'medium' }: CaptchaProps) {
  const generateNoise = useCallback((diff: string) => {
    const count = diff === 'easy' ? 5 : diff === 'medium' ? 10 : 15;
    const noise = [];
    for (let i = 0; i < count; i++) {
      noise.push({
        x: Math.random() * 100,
        y: Math.random() * 40,
        rotation: Math.random() * 360
      });
    }
    return noise;
  }, []);

  const generateCaptcha = useCallback((diff: string) => {
    const length = diff === 'easy' ? 4 : diff === 'medium' ? 6 : 8;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return {
      text: result,
      noise: generateNoise(diff)
    };
  }, [generateNoise]);

  const [captcha, setCaptcha] = useState(generateCaptcha(difficulty));
  const [userAnswer, setUserAnswer] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');

  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha(difficulty));
    setUserAnswer('');
    setError('');
    setIsVerified(false);
  }, [difficulty]);

  const handleVerify = () => {
    if (userAnswer.toLowerCase() === captcha.text.toLowerCase()) {
      setIsVerified(true);
      setError('');
      onVerify(true);
    } else {
      setError('Incorrect. Réessayez.');
      onVerify(false);
      refreshCaptcha();
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 max-w-sm mx-auto">
      <h3 className="text-lg font-semibold mb-4">Vérification humaine</h3>
      
      <div className="bg-secondary rounded-lg p-4 mb-4 relative overflow-hidden">
        <svg width="100%" height="60" className="select-none">
          {captcha.noise.map((noise, i) => (
            <line
              key={i}
              x1={`${noise.x}%`}
              y1={`${noise.y}%`}
              x2={`${noise.x + 20}%`}
              y2={`${noise.y + 10}%`}
              stroke="rgba(128, 128, 128, 0.3)"
              strokeWidth="1"
              transform={`rotate(${noise.rotation}, ${noise.x}, ${noise.y})`}
            />
          ))}
          <text
            x="50%"
            y="50%"
            dominantBaseline="middle"
            textAnchor="middle"
            className="text-2xl font-bold fill-foreground"
            style={{
              fontFamily: 'monospace',
              letterSpacing: '4px',
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            {captcha.text.split('').map((char, i) => (
              <tspan
                key={i}
                style={{
                  transform: `rotate(${(Math.random() - 0.5) * 20}deg)`,
                  display: 'inline-block'
                }}
              >
                {char}
              </tspan>
            ))}
          </text>
        </svg>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          placeholder="Entrez les caractères"
          className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
          disabled={isVerified}
        />
        <button
          onClick={refreshCaptcha}
          className="p-2 bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors"
          title="Rafraîchir"
          disabled={isVerified}
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <p className="text-sm text-destructive mb-3">{error}</p>
      )}

      <button
        onClick={handleVerify}
        disabled={!userAnswer || isVerified}
        className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isVerified ? '✓ Vérifié' : 'Vérifier'}
      </button>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        Cette vérification aide à prévenir les abus automatisés.
      </p>
    </div>
  );
}

// Version mathématique du CAPTCHA
export function MathCaptcha({ onVerify }: CaptchaProps) {
  const generateMathProblem = useCallback(() => {
    const operations = ['+', '-', '*'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    let num1, num2, answer;

    switch (operation) {
      case '+':
        num1 = Math.floor(Math.random() * 50) + 1;
        num2 = Math.floor(Math.random() * 50) + 1;
        answer = num1 + num2;
        break;
      case '-':
        num1 = Math.floor(Math.random() * 50) + 20;
        num2 = Math.floor(Math.random() * 20) + 1;
        answer = num1 - num2;
        break;
      case '*':
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
        answer = num1 * num2;
        break;
    }

    return {
      question: `${num1} ${operation} ${num2}`,
      answer
    };
  }, []);

  const [mathProblem, setMathProblem] = useState(generateMathProblem());
  const [userAnswer, setUserAnswer] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');

  const refreshCaptcha = useCallback(() => {
    setMathProblem(generateMathProblem());
    setUserAnswer('');
    setError('');
    setIsVerified(false);
  }, [generateMathProblem]);

  const handleVerify = () => {
    const parsedAnswer = parseInt(userAnswer);
    if (parsedAnswer === mathProblem.answer) {
      setIsVerified(true);
      setError('');
      onVerify(true);
    } else {
      setError('Incorrect. Réessayez.');
      onVerify(false);
      refreshCaptcha();
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 max-w-sm mx-auto">
      <h3 className="text-lg font-semibold mb-4">Vérification mathématique</h3>
      
      <div className="bg-secondary rounded-lg p-6 mb-4 text-center">
        <p className="text-3xl font-bold text-foreground">{mathProblem.question} = ?</p>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          type="number"
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          placeholder="Réponse"
          className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
          disabled={isVerified}
        />
        <button
          onClick={refreshCaptcha}
          className="p-2 bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors"
          title="Nouveau problème"
          disabled={isVerified}
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <p className="text-sm text-destructive mb-3">{error}</p>
      )}

      <button
        onClick={handleVerify}
        disabled={!userAnswer || isVerified}
        className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isVerified ? '✓ Vérifié' : 'Vérifier'}
      </button>
    </div>
  );
}
