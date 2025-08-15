import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Lock, Target } from 'lucide-react';

interface Achievement {
  id: number;
  name: string;
  description: string;
  type: 'fixed' | 'progressive';
  category: string;
  goal_value: number;
  icon_url: string;
  progress_value: number;
  achieved: number;
  achieved_at?: string;
}

interface AchievementsGridProps {
  achievements: Achievement[];
  stats: {
    total: number;
    unlocked: number;
    locked: number;
  };
}

const AchievementsGrid: React.FC<AchievementsGridProps> = ({ achievements, stats }) => {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'exercise': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'nutrition': return 'bg-green-100 text-green-800 border-green-200';
      case 'daily_steps': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'meditation': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'exercise': return 'Entrenamiento';
      case 'nutrition': return 'Nutrición';
      case 'daily_steps': return 'Pasos Diarios';
      case 'meditation': return 'Meditación';
      default: return category;
    }
  };

  const formatGoalValue = (category: string, value: number) => {
    if (category === 'daily_steps') {
      return value.toLocaleString();
    }
    return value.toString();
  };

  const getProgressPercentage = (achievement: Achievement) => {
    if (achievement.achieved) return 100;
    if (achievement.type === 'progressive') {
      return Math.min((achievement.progress_value / achievement.goal_value) * 100, 100);
    }
    // For fixed achievements, it's either 0% or 100%
    return achievement.progress_value >= achievement.goal_value ? 100 : 0;
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            Resumen de Logros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-yellow-600">{stats.unlocked}</div>
              <div className="text-sm text-muted-foreground">Desbloqueados</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">{stats.locked}</div>
              <div className="text-sm text-muted-foreground">Bloqueados</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </div>
          
          {stats.total > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Progreso General</span>
                <span>{Math.round((stats.unlocked / stats.total) * 100)}%</span>
              </div>
              <Progress value={(stats.unlocked / stats.total) * 100} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Achievements Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Logros</CardTitle>
          <CardDescription>
            Completa desafíos para desbloquear logros y demostrar tu progreso
          </CardDescription>
        </CardHeader>
        <CardContent>
          {achievements.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-muted-foreground">No hay logros disponibles aún</p>
              <p className="text-sm text-muted-foreground mt-2">
                ¡Comienza a completar hábitos para desbloquear logros!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((achievement) => {
                const isUnlocked = achievement.achieved === 1;
                const progressPercentage = getProgressPercentage(achievement);
                
                return (
                  <div
                    key={achievement.id}
                    className={`relative border rounded-lg p-4 transition-all duration-200 ${
                      isUnlocked 
                        ? 'border-yellow-300 bg-yellow-50 shadow-md' 
                        : 'border-gray-200 bg-gray-50 opacity-75'
                    }`}
                  >
                    {/* Achievement Icon */}
                    <div className="flex items-start justify-between mb-3">
                      <div className={`text-3xl ${isUnlocked ? '' : 'grayscale opacity-50'}`}>
                        {achievement.icon_url || '🏆'}
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getCategoryColor(achievement.category)}`}
                        >
                          {getCategoryName(achievement.category)}
                        </Badge>
                        
                        {isUnlocked && (
                          <Trophy className="w-4 h-4 text-yellow-600" />
                        )}
                        
                        {!isUnlocked && (
                          <Lock className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Achievement Details */}
                    <div className="space-y-2">
                      <h4 className={`font-semibold ${isUnlocked ? 'text-gray-900' : 'text-gray-600'}`}>
                        {achievement.name}
                      </h4>
                      
                      <p className={`text-sm ${isUnlocked ? 'text-gray-700' : 'text-gray-500'}`}>
                        {achievement.description}
                      </p>

                      {/* Progress for Progressive Achievements */}
                      {achievement.type === 'progressive' && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">
                              {achievement.progress_value.toLocaleString()} / {formatGoalValue(achievement.category, achievement.goal_value)}
                            </span>
                            <span className="text-muted-foreground">
                              {Math.round(progressPercentage)}%
                            </span>
                          </div>
                          <Progress value={progressPercentage} className="h-1.5" />
                        </div>
                      )}

                      {/* Goal for Fixed Achievements */}
                      {achievement.type === 'fixed' && !isUnlocked && (
                        <div className="text-xs text-muted-foreground">
                          Meta: {formatGoalValue(achievement.category, achievement.goal_value)}
                          {achievement.category === 'daily_steps' && ' pasos'}
                          {achievement.category !== 'daily_steps' && ' días'}
                        </div>
                      )}

                      {/* Achieved Date */}
                      {isUnlocked && achievement.achieved_at && (
                        <div className="text-xs text-yellow-700 mt-2">
                          🎉 Desbloqueado el {new Date(achievement.achieved_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {/* Achievement Type Badge */}
                    <Badge 
                      variant="secondary" 
                      className="absolute top-2 left-2 text-xs"
                    >
                      {achievement.type === 'progressive' ? 'Progresivo' : 'Fijo'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AchievementsGrid;
