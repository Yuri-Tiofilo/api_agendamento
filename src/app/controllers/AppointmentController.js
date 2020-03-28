import Appointment from '../models/Appointment';
import User from '../models/User';
import File from '../models/File';

import CreateAppointmentService from '../services/CreateAppointmentService';
import DeleteAppointmentService from '../services/DeleteAppointmentService';

class AppointmentController {
  async index(req, res) {
    // Listing of appointments sorted by date and not canceled,
    // having their attributes necessary according to the business rule.

    const { page = 1, perPage = 20 } = req.query;

    const appointments = await Appointment.findAll({
      where: { user_id: req.userId, canceled: null },
      order: ['date'],
      limit: perPage, // limit paginate
      offset: (page - 1) * perPage, // how many will skip paging
      attributes: ['id', 'date', 'past', 'cancelable'],
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name', 'email'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['name', 'path', 'url'],
            },
          ],
        },
      ],
    });

    return res.json(appointments);
  }

  async store(req, res) {
    const { provider_id, date } = req.body;

    const appointment = await CreateAppointmentService.run({
      provider_id,
      user_id: req.userId,
      date,
    });

    return res.json(appointment);
  }

  async delete(req, res) {
    const appointment = await DeleteAppointmentService.run({
      provider_id: req.params.id,
      user_id: req.userId,
    });

    return res.json(appointment);
  }
}
export default new AppointmentController();
