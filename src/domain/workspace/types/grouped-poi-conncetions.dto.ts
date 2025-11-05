import { PoiConnectionResponseDto } from '../dto/poi-connection-response.dto.js';

export type GroupedPoiConncetionsDto = Record<
  string,
  PoiConnectionResponseDto[]
>;
export const buildGroupedPoiConncetionsDto = (
  planDayIds: string[],
  connections: PoiConnectionResponseDto[],
): GroupedPoiConncetionsDto => {
  const result: GroupedPoiConncetionsDto = {};

  for (const planDayId of planDayIds) {
    result[planDayId] = [];
  }

  for (const connection of connections) {
    const list = result[connection.planDayId];
    if (list) list.push(connection);
  }

  return result;
};
