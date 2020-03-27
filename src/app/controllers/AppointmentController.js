import { isBefore, subHours } from 'date-fns';
import Appointment from '../models/Appointment';
import User from '../models/User';
import File from '../models/File';
import Queue from '../../lib/Queue';
import CancelationMail from '../jobs/CancellationMail';

import CreateAppointmentService from '../services/CreateAppointmentService';

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
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });
    const checkUserProvider = await User.findOne({
      where: { id: req.userId, provider: true },
    });
    if (checkUserProvider) {
      return res.status(401).json({ error: 'User is a provider.' });
    }

    if (appointment.user_id !== req.userId) {
      return res.status(401).json({
        error: "You don't have permission to cancel this appointment",
      });
    }

    const dateWithSub = subHours(appointment.date, 2);

    if (isBefore(dateWithSub, new Date())) {
      return res.status(401).json({
        error: 'You can only cancel appointments 2 hours in advance',
      });
    }

    appointment.canceled = new Date();

    await appointment.save();

    await Queue.add(CancelationMail.key, {
      appointment,
    });

    return res.json(appointment);
  }
}
export default new AppointmentController();
