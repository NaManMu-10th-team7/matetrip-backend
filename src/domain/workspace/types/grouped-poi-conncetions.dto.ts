import { PoiConnectionResponseDto } from '../dto/poi/poi-connection-response.dto.js';

export type GroupedPoiConnectionsDto = Record<
  string,
  PoiConnectionResponseDto[]
>;
export const buildGroupedPoiConnectionsDto = (
  planDayIds: string[],
  connections: PoiConnectionResponseDto[],
): GroupedPoiConnectionsDto => {
  const result: GroupedPoiConnectionsDto = {};

  for (const planDayId of planDayIds) {
    result[planDayId] = [];
  }

  for (const connection of connections) {
    const list = result[connection.planDayId];
    if (list) list.push(connection);
  }

  return result;
};
