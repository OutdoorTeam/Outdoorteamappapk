import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useStepsLeaderboard, useHabitsLeaderboard } from '@/hooks/api/use-achievements';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Medal, Award, Footprints, Target, Crown, Calendar } from 'lucide-react';

const LeaderboardTabs: React.FC = () => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = React.useState(
    new Date().toISOString().substring(0, 7) // Current month YYYY-MM
  );

  const { data: stepsData, isLoading: stepsLoading } = useStepsLeaderboard(selectedMonth);
  const { data: habitsData, isLoading: habitsLoading } = useHabitsLeaderboard(selectedMonth);

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1: return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Award className="w-5 h-5 text-amber-600" />;
      default: return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-500">#{position}</span>;
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const getMonthName = (monthStr: string) => {
    const date = new Date(monthStr + '-01');
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  const generateMonthOptions = () => {
    const months = [];
    const currentDate = new Date();
    
    // Generate last 6 months
    for (let i = 0; i < 6; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthStr = date.toISOString().substring(0, 7);
      months.push({
        value: monthStr,
        label: getMonthName(monthStr)
      });
    }
    return months;
  };

  const monthOptions = generateMonthOptions();

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Rankings Mensuales
          </CardTitle>
          <CardDescription>
            Compite con otros usuarios y ve tu posición en las clasificaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Mes:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {monthOptions.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="steps" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="steps" className="flex items-center gap-2">
            <Footprints className="w-4 h-4" />
            Ranking de Pasos
          </TabsTrigger>
          <TabsTrigger 
            value="habits" 
            className="flex items-center gap-2"
            disabled={user?.plan_type !== 'Programa Totum'}
          >
            <Target className="w-4 h-4" />
            Ranking de Hábitos
            {user?.plan_type !== 'Programa Totum' && (
              <Crown className="w-3 h-3 text-purple-600" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="steps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Footprints className="w-5 h-5 text-blue-600" />
                Clasificación Global de Pasos - {getMonthName(selectedMonth)}
              </CardTitle>
              <CardDescription>
                Ranking de todos los usuarios por total de pasos en el mes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stepsLoading ? (
                <div className="text-center py-8">
                  <div className="text-sm text-muted-foreground">Cargando clasificación...</div>
                </div>
              ) : !stepsData?.leaderboard?.length ? (
                <div className="text-center py-8">
                  <Footprints className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay datos para este mes</p>
                </div>
              ) : (
                <>
                  {/* User's position if not in top 10 */}
                  {stepsData.current_user && stepsData.current_user.position > 10 && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-sm text-blue-800 font-medium mb-2">Tu posición:</div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="bg-blue-100 text-blue-800">
                            #{stepsData.current_user.position}
                          </Badge>
                          <span className="font-medium">Tú</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-800">
                            {formatNumber(stepsData.current_user.total_steps)}
                          </div>
                          <div className="text-xs text-blue-600">pasos</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Pos.</TableHead>
                        <TableHead>Usuario</TableHead>
                        <TableHead className="text-right">Pasos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stepsData.leaderboard.slice(0, 20).map((entry, index) => (
                        <TableRow 
                          key={entry.user_id}
                          className={entry.is_current_user ? 'bg-blue-50 border-blue-200' : ''}
                        >
                          <TableCell className="flex items-center justify-center">
                            {getRankIcon(entry.position)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {entry.is_current_user ? (
                              <div className="flex items-center gap-2">
                                <span>Tú</span>
                                <Badge variant="outline" className="text-xs">Tu</Badge>
                              </div>
                            ) : (
                              entry.full_name
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-bold">{formatNumber(entry.total_steps)}</div>
                            <div className="text-xs text-muted-foreground">pasos</div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="habits" className="space-y-4">
          {user?.plan_type !== 'Programa Totum' ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Crown className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Ranking Exclusivo Totum</h3>
                  <p className="text-muted-foreground mb-4">
                    Este ranking está disponible solo para miembros del Programa Totum
                  </p>
                  <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-300">
                    Actualiza tu plan para acceder
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-purple-600" />
                  Clasificación Totum de Hábitos - {getMonthName(selectedMonth)}
                </CardTitle>
                <CardDescription>
                  Ranking exclusivo para miembros Totum por puntos de hábitos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {habitsLoading ? (
                  <div className="text-center py-8">
                    <div className="text-sm text-muted-foreground">Cargando clasificación...</div>
                  </div>
                ) : !habitsData?.leaderboard?.length ? (
                  <div className="text-center py-8">
                    <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">No hay datos para este mes</p>
                  </div>
                ) : (
                  <>
                    {/* User's position if not in top 10 */}
                    {habitsData.current_user && habitsData.current_user.position > 10 && (
                      <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="text-sm text-purple-800 font-medium mb-2">Tu posición:</div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-purple-100 text-purple-800">
                              #{habitsData.current_user.position}
                            </Badge>
                            <span className="font-medium">Tú</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-purple-800">
                              {formatNumber(habitsData.current_user.total_points)}
                            </div>
                            <div className="text-xs text-purple-600">puntos</div>
                          </div>
                        </div>
                      </div>
                    )}

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Pos.</TableHead>
                          <TableHead>Usuario</TableHead>
                          <TableHead className="text-right">Puntos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {habitsData.leaderboard.slice(0, 20).map((entry, index) => (
                          <TableRow 
                            key={entry.user_id}
                            className={entry.is_current_user ? 'bg-purple-50 border-purple-200' : ''}
                          >
                            <TableCell className="flex items-center justify-center">
                              {getRankIcon(entry.position)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {entry.is_current_user ? (
                                <div className="flex items-center gap-2">
                                  <span>Tú</span>
                                  <Badge variant="outline" className="text-xs">Tu</Badge>
                                </div>
                              ) : (
                                entry.full_name
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-bold">{formatNumber(entry.total_points)}</div>
                              <div className="text-xs text-muted-foreground">puntos</div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeaderboardTabs;
