import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { Op } from 'sequelize';
import User from '../models/User';
import Appointment from '../models/Appointment';

class SchudeleCrontoller {
  async index(req, res) {
    const checkUserProvider = await User.findOne({
      where: { id: req.userId, provider: true },
    });

    if (!checkUserProvider) {
      return res.status(401).json({ error: 'User is not a provider.' });
    }
    const { page = 1, perPage = 20 } = req.query;
    const { date } = req.query;
    if (date) {
      const parseDate = parseISO(date);

      const list = await Appointment.findAll({
        where: {
          provider_id: req.userId,
          canceled: null,
          date: {
            [Op.between]: [startOfDay(parseDate), endOfDay(parseDate)],
          },
        },
        order: ['date'],
        limit: perPage, // limit paginate
        offset: (page - 1) * perPage, // how many will skip paging
      });

      return res.json(list);
    }

    const list = await Appointment.findAll({
      where: {
        provider_id: req.userId,
        canceled: null,
      },
      order: ['date'],
      limit: perPage, // limit paginate
      offset: (page - 1) * perPage, // how many will skip paging
    });
    return res.json(list);
  }
}

export default new SchudeleCrontoller();
